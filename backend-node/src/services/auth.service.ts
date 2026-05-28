import argon2     from 'argon2';
import jwt        from 'jsonwebtoken';
import { env }    from '../config/env';
import { odoo }   from '../lib/odoo-client';
import { logger } from '../lib/logger';
import {
  setRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '../lib/redis-client';
import type { JwtAccessPayload, JwtRefreshPayload } from '../types/api.types';

// ─── Config argon2 (OWASP 2024) ───────────────────────────────────────────────
const ARGON2_OPTIONS: argon2.Options = {
  type:         argon2.argon2id,
  memoryCost:   65536,
  timeCost:     3,
  parallelism:  4,
};

// ─── Génération des tokens ────────────────────────────────────────────────────

export async function generateTokenPair(partnerUuid: string, email: string) {
  const accessPayload: JwtAccessPayload = {
    sub: partnerUuid, partnerUuid, email, type: 'access',
  };
  const refreshPayload: JwtRefreshPayload = {
    sub: partnerUuid, type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  // Stocker dans Redis (TTL 7 jours)
  await setRefreshToken(refreshToken, partnerUuid);

  return { accessToken, refreshToken };
}

// ─── Vérification / révocation refresh token ─────────────────────────────────

export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    jwt.verify(token, env.JWT_REFRESH_SECRET);
    const partnerUuid = await getRefreshToken(token);
    return partnerUuid;
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await deleteRefreshToken(token);
}

// ─── Hash / verify passwords ──────────────────────────────────────────────────

/**
 * Hache un mot de passe avec argon2id (sécurisé).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Vérifie un mot de passe contre son hash argon2.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ─── Auth flows ──────────────────────────────────────────────────────────────

interface RegisterInput {
  name:           string;
  email:          string;
  password:       string;
  countryCode:    string;
  investorType:   string;
  marketingOptin: boolean;
}

interface AuthResult {
  partnerUuid:  string;
  email:        string;
  accessToken:  string;
  refreshToken: string;
}

/**
 * Inscription d'un nouvel investisseur.
 * 1. Hash le mot de passe avec argon2id
 * 2. Crée le partner dans Odoo via register_investor()
 * 3. Retourne une paire de tokens JWT
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // Résoudre le pays
  type CountryRecord = { id: number; code: string };
  const countries = await odoo.search<CountryRecord>(
    'res.country',
    [['code', '=', input.countryCode.toUpperCase()]],
    ['id'],
    1,
  );
  if (!countries.length) {
    throw Object.assign(new Error(`Pays introuvable: ${input.countryCode}`), { status: 400 });
  }

  // Hash argon2id — jamais envoyer le mot de passe en clair à Odoo
  const passwordHash = await hashPassword(input.password);

  const result = await odoo.callKw<{ uuid: string; partner_id: number }>(
    'res.partner',
    'register_investor',
    [input.name, input.email, passwordHash, countries[0].id, input.investorType],
    { terms_version: new Date().toISOString().slice(0, 7) },
  );

  logger.info(`[Auth] Nouvel investisseur créé: ${result.uuid}`);
  const tokens = await generateTokenPair(result.uuid, input.email);
  return { partnerUuid: result.uuid, email: input.email, ...tokens };
}

/**
 * Connexion d'un investisseur.
 * 1. Charge le partner depuis Odoo
 * 2. Vérifie le hash argon2 stocké dans x_password_hash
 * 3. Génère et retourne JWT
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  type PartnerRecord = {
    id:                number;
    x_uuid:            string;
    email:             string;
    x_account_state:   string;
    x_password_hash:   string;
  };

  const partners = await odoo.search<PartnerRecord>(
    'res.partner',
    [['email', '=', email], ['x_is_investor', '=', true]],
    ['id', 'x_uuid', 'email', 'x_account_state', 'x_password_hash'],
    1,
  );

  if (!partners.length) {
    // Délai constant pour éviter le timing attack (user enumeration)
    await new Promise(r => setTimeout(r, 200));
    throw Object.assign(new Error('Email ou mot de passe incorrect.'), { status: 401 });
  }

  const partner = partners[0];

  if (partner.x_account_state === 'closed') {
    throw Object.assign(new Error('Ce compte a été fermé.'), { status: 403 });
  }
  if (partner.x_account_state === 'suspended') {
    throw Object.assign(new Error('Ce compte est suspendu. Contactez le support.'), { status: 403 });
  }

  // Vérification argon2 — timing constant (argon2.verify gère ça internalement)
  const passwordOk = await verifyPassword(partner.x_password_hash, password);
  if (!passwordOk) {
    logger.warn(`[Auth] Tentative de connexion échouée pour ${email}`);
    throw Object.assign(new Error('Email ou mot de passe incorrect.'), { status: 401 });
  }

  logger.info(`[Auth] Connexion réussie: ${partner.x_uuid}`);
  const tokens = await generateTokenPair(partner.x_uuid, partner.email);
  return { partnerUuid: partner.x_uuid, email: partner.email, ...tokens };
}
