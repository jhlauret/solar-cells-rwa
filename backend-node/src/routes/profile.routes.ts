import { Router, Request, Response } from 'express';
import { z }             from 'zod';
import { requireAuth }   from '../middleware/auth';
import { validate }      from '../middleware/validate';
import { asyncHandler }  from '../middleware/error-handler';
import { odoo }          from '../lib/odoo-client';
import { ok, fail }      from '../types/api.types';

const router = Router();

// ── GET /profile ──────────────────────────────────────────────────────────────
router.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    type PartnerRecord = {
      id:                  number;
      name:                string;
      email:               string;
      phone:               string | false;
      x_uuid:              string;
      x_account_state:     string;
      x_kyc_status:        string;
      x_investor_type:     string;
      x_date_of_birth:     string | false;
      x_iban:              string | false;
      x_marketing_optin:   boolean;
      country_id:          [number, string] | false;
      x_email_verified:    boolean;
    };

    const partners = await odoo.callKw<PartnerRecord[]>(
      'res.partner',
      'search_read',
      [[['x_uuid', '=', req.user!.partnerUuid]]],
      {
        fields: [
          'name', 'email', 'phone', 'x_uuid', 'x_account_state',
          'x_kyc_status', 'x_investor_type', 'x_date_of_birth',
          'x_iban', 'x_marketing_optin', 'country_id', 'x_email_verified',
        ],
        limit: 1,
      },
    );

    if (!partners.length) {
      res.status(404).json(fail('Profil introuvable.'));
      return;
    }

    const p = partners[0];
    res.json(ok({
      uuid:            p.x_uuid,
      name:            p.name,
      email:           p.email,
      phone:           p.phone || null,
      accountState:    p.x_account_state,
      kycStatus:       p.x_kyc_status,
      investorType:    p.x_investor_type,
      dateOfBirth:     p.x_date_of_birth || null,
      iban:            p.x_iban || null,
      marketingOptin:  p.x_marketing_optin,
      country:         Array.isArray(p.country_id) ? p.country_id[1] : null,
      emailVerified:   p.x_email_verified,
    }));
  }),
);

// ── PATCH /profile ────────────────────────────────────────────────────────────
const patchProfileSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  phone:          z.string().min(6).max(20).optional(),
  iban:           z.string().min(10).max(34).optional(),
  marketingOptin: z.boolean().optional(),
}).strict();

router.patch('/',
  requireAuth,
  validate(patchProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updates = req.body as z.infer<typeof patchProfileSchema>;

    const partners = await odoo.callKw<{ id: number }[]>(
      'res.partner', 'search_read',
      [[['x_uuid', '=', req.user!.partnerUuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!partners.length) {
      res.status(404).json(fail('Profil introuvable.'));
      return;
    }

    // Mapper les champs frontend → champs Odoo
    const odooVals: Record<string, unknown> = {};
    if (updates.name           !== undefined) odooVals.name              = updates.name;
    if (updates.phone          !== undefined) odooVals.phone             = updates.phone;
    if (updates.iban           !== undefined) odooVals.x_iban            = updates.iban;
    if (updates.marketingOptin !== undefined) odooVals.x_marketing_optin = updates.marketingOptin;

    await odoo.write('res.partner', [partners[0].id], odooVals);
    res.json(ok({ updated: true }));
  }),
);

export default router;
