import { Router, Request, Response } from 'express';
import { validate }       from '../middleware/validate';
import { requireAuth }    from '../middleware/auth';
import { asyncHandler }   from '../middleware/error-handler';
import { register, login,
         generateTokenPair, verifyRefreshToken,
         revokeRefreshToken } from '../services/auth.service';
import { registerSchema, loginSchema, ok, fail } from '../types/api.types';
import { odoo }           from '../lib/odoo-client';
import { logger }         from '../lib/logger';
import { incrementOtpAttempts, resetOtpAttempts } from '../lib/redis-client';
import { env }            from '../config/env';

const router = Router();

const COOKIE_OPTS = {
  httpOnly:  true,
  secure:    env.NODE_ENV === 'production',
  sameSite:  'strict' as const,
  path:      '/',
};

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register',
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await register(req.body);

    // Envoyer l'OTP de vérification en arrière-plan (fire-and-forget)
    odoo.callKw('res.partner', 'send_verification_email', [result.partnerUuid])
      .catch(err => logger.warn('[Auth] OTP send failed:', err));

    res
      .cookie('access_token',  result.accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .status(201)
      .json(ok({ partnerUuid: result.partnerUuid, email: result.email }));
  }),
);

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password);
    res
      .cookie('access_token',  result.accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json(ok({ partnerUuid: result.partnerUuid, email: result.email }));
  }),
);

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token as string | undefined
      ?? req.body?.refreshToken as string | undefined;

    if (!token) {
      res.status(401).json(fail('Refresh token manquant.', 'UNAUTHORIZED'));
      return;
    }

    const partnerUuid = await verifyRefreshToken(token);
    if (!partnerUuid) {
      res.status(401).json(fail('Refresh token invalide ou expiré.', 'TOKEN_EXPIRED'));
      return;
    }

    await revokeRefreshToken(token);   // rotation
    const { accessToken, refreshToken } = await generateTokenPair(partnerUuid, '');

    res
      .cookie('access_token',  accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json(ok({ refreshed: true }));
  }),
);

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res
      .clearCookie('access_token')
      .clearCookie('refresh_token')
      .json(ok({ loggedOut: true }));
  },
);

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    // Récupérer le statut du compte depuis Odoo
    type PartnerRecord = { x_account_state: string; email: string };
    const partners = await odoo.callKw<PartnerRecord[]>(
      'res.partner',
      'search_read',
      [[['x_uuid', '=', req.user!.partnerUuid]]],
      { fields: ['x_account_state', 'email'], limit: 1 },
    );
    const accountState = partners[0]?.x_account_state ?? 'unknown';
    res.json(ok({
      partnerUuid:  req.user!.partnerUuid,
      email:        req.user!.email,
      accountState,
    }));
  }),
);

// ── POST /auth/send-verification ──────────────────────────────────────────────
// Envoie (ou renvoie) l'OTP par email. Appelé juste après register(),
// ou depuis la page de vérification via le bouton "Renvoyer".
router.post('/send-verification',
  asyncHandler(async (req: Request, res: Response) => {
    const { partnerUuid } = req.body as { partnerUuid?: string };
    if (!partnerUuid) {
      res.status(400).json(fail('partnerUuid requis.'));
      return;
    }
    const result = await odoo.callKw<{ expires_at: string }>(
      'res.partner',
      'send_verification_email',
      [partnerUuid],
    );
    res.json(ok(result));
  }),
);

// ── POST /auth/verify-email ───────────────────────────────────────────────────
// Vérifie l'OTP saisi par l'utilisateur et active le compte.
router.post('/verify-email',
  asyncHandler(async (req: Request, res: Response) => {
    const { partnerUuid, otp } = req.body as {
      partnerUuid?: string;
      otp?:         string;
    };
    if (!partnerUuid || !otp) {
      res.status(400).json(fail('partnerUuid et otp sont requis.'));
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      res.status(400).json(fail('Le code doit contenir exactement 6 chiffres.'));
      return;
    }

    // Rate limit Redis : max 10 tentatives / 15 min / IP
    const ip       = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    const attempts = await incrementOtpAttempts(ip);
    if (attempts > 10) {
      res.status(429).json(fail(
        'Trop de tentatives. Attendez 15 minutes avant de réessayer.',
        'RATE_LIMIT',
      ));
      return;
    }

    const result = await odoo.callKw<{ activated: boolean }>(
      'res.partner',
      'verify_email_otp',
      [partnerUuid, otp.trim()],
    );

    // Succès → réinitialiser le compteur IP
    if (result.activated) await resetOtpAttempts(ip);

    res.json(ok(result));
  }),
);

// ── POST /auth/forgot-password ────────────────────────────────────────────────
// Envoie un OTP de réinitialisation par email (même mécanisme que verify-email).
router.post('/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json(fail('email requis.'));
      return;
    }

    // Chercher le partner — ne pas révéler si l'email existe (sécurité)
    type PartnerRecord = { id: number; x_uuid: string; x_account_state: string };
    const partners = await odoo.callKw<PartnerRecord[]>(
      'res.partner', 'search_read',
      [[['email', '=', email.toLowerCase().trim()], ['x_is_investor', '=', true]]],
      { fields: ['id', 'x_uuid', 'x_account_state'], limit: 1 },
    );

    // Réponse identique qu'il existe ou non (éviter l'énumération d'emails)
    if (partners.length && partners[0].x_account_state !== 'closed') {
      await odoo.callKw('res.partner', 'send_verification_email', [partners[0].x_uuid])
        .catch(err => logger.warn('[Auth] forgot-password OTP send failed:', err));
    }

    res.json(ok({ sent: true }));
  }),
);

// ── POST /auth/reset-password ─────────────────────────────────────────────────
// Vérifie l'OTP puis change le mot de passe.
router.post('/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body as {
      email?: string; otp?: string; newPassword?: string;
    };
    if (!email || !otp || !newPassword) {
      res.status(400).json(fail('email, otp et newPassword sont requis.'));
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json(fail('Le mot de passe doit faire au moins 8 caractères.'));
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      res.status(400).json(fail('Code invalide.'));
      return;
    }

    // Trouver le partner
    type PartnerRecord = { id: number; x_uuid: string };
    const partners = await odoo.callKw<PartnerRecord[]>(
      'res.partner', 'search_read',
      [[['email', '=', email.toLowerCase().trim()], ['x_is_investor', '=', true]]],
      { fields: ['id', 'x_uuid'], limit: 1 },
    );
    if (!partners.length) {
      res.status(400).json(fail('Code incorrect ou expiré.', 'INVALID_OTP'));
      return;
    }

    // Vérifier l'OTP
    const verifyResult = await odoo.callKw<{ activated: boolean }>(
      'res.partner', 'verify_email_otp', [partners[0].x_uuid, otp.trim()],
    );
    if (!verifyResult.activated) {
      res.status(400).json(fail('Code incorrect ou expiré.', 'INVALID_OTP'));
      return;
    }

    // Hacher et stocker le nouveau mot de passe
    const { hashPassword } = await import('../services/auth.service');
    const newHash = await hashPassword(newPassword);
    await odoo.write('res.partner', [partners[0].id], { x_password_hash: newHash });

    logger.info('[Auth] Mot de passe réinitialisé pour UUID:', partners[0].x_uuid);
    res.json(ok({ reset: true }));
  }),
);

export default router;
