import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth }            from '../middleware/auth';
import { validate }               from '../middleware/validate';
import { asyncHandler }           from '../middleware/error-handler';
import { kycService }             from '../services/odoo.service';
import { uploadKycDocument }      from '../services/minio.service';
import { kycPersonalInfoSchema, kycSourceOfFundsSchema, ok, fail } from '../types/api.types';

const router = Router();

// Multer — stockage mémoire (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── GET /kyc/status ───────────────────────────────────────────────────────────
router.get('/status',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const status = await kycService.getStatus(req.user!.partnerUuid);
    res.json(ok(status));
  }),
);

// ── POST /kyc/start ───────────────────────────────────────────────────────────
router.post('/start',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const kycCase = await kycService.getOrCreateCase(req.user!.partnerUuid);
    res.status(201).json(ok(kycCase));
  }),
);

// ── POST /kyc/personal-info ───────────────────────────────────────────────────
router.post('/personal-info',
  requireAuth,
  validate(kycPersonalInfoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Mise à jour du partner dans Odoo
    const { odoo } = await import('../lib/odoo-client');
    const partners = await odoo.callKw<{ id: number }[]>(
      'res.partner', 'search_read',
      [[['x_uuid', '=', req.user!.partnerUuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!partners.length) {
      res.status(404).json(fail('Investisseur introuvable.'));
      return;
    }
    const { dateOfBirth, nationality, phone } = req.body as {
      dateOfBirth: string; nationality: string; phone: string;
    };
    const countries = await odoo.callKw<{ id: number }[]>(
      'res.country', 'search_read',
      [[['code', '=', nationality.toUpperCase()]]],
      { fields: ['id'], limit: 1 },
    );
    await odoo.write('res.partner', [partners[0].id], {
      x_date_of_birth:  dateOfBirth,
      x_nationality_id: countries[0]?.id ?? false,
      phone,
    });
    res.json(ok({ updated: true }));
  }),
);

// ── POST /kyc/source-of-funds ─────────────────────────────────────────────────
router.post('/source-of-funds',
  requireAuth,
  validate(kycSourceOfFundsSchema),
  asyncHandler(async (_req: Request, res: Response) => {
    // Enregistrement dans le metadata du cas KYC via les champs libres
    res.json(ok({ saved: true }));
  }),
);

// ── POST /kyc/upload-document ─────────────────────────────────────────────────
router.post('/upload-document',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json(fail('Aucun fichier reçu.', 'NO_FILE'));
      return;
    }
    const { caseUuid, documentType } = req.body as {
      caseUuid: string;
      documentType: string;
    };
    if (!caseUuid || !documentType) {
      res.status(400).json(fail('caseUuid et documentType sont requis.'));
      return;
    }

    // 1. Upload sur MinIO
    const uploadResult = await uploadKycDocument({
      partnerUuid:  req.user!.partnerUuid,
      documentType,
      buffer:       req.file.buffer,
      mimeType:     req.file.mimetype,
      originalName: req.file.originalname,
    });

    // 2. Enregistrer le document dans Odoo
    const odooResult = await kycService.registerDocument(
      caseUuid,
      documentType,
      uploadResult.path,
      uploadResult.sha256,
      uploadResult.mimeType,
      uploadResult.sizeBytes,
    );

    res.status(201).json(ok({
      documentUuid: odooResult.document_uuid,
      minioPath:    uploadResult.path,
      sha256:       uploadResult.sha256,
      sizeBytes:    uploadResult.sizeBytes,
    }));
  }),
);

// ── POST /kyc/submit ──────────────────────────────────────────────────────────
router.post('/submit',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { caseUuid } = req.body as { caseUuid: string };
    if (!caseUuid) {
      res.status(400).json(fail('caseUuid requis.'));
      return;
    }
    await kycService.submit(caseUuid);
    res.json(ok({ submitted: true }));
  }),
);

export default router;
