import { Router, Request, Response } from 'express';
import { optionalAuth }  from '../middleware/auth';
import { asyncHandler }  from '../middleware/error-handler';
import { assetsService } from '../services/odoo.service';
import { ok } from '../types/api.types';
import { z } from 'zod';

const router = Router();

const filtersSchema = z.object({
  country_id:  z.coerce.number().optional(),
  asset_type:  z.string().optional(),
  min_yield:   z.coerce.number().optional(),
  max_yield:   z.coerce.number().optional(),
}).optional();

// ── GET /assets ───────────────────────────────────────────────────────────────
router.get('/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = filtersSchema.parse(req.query) ?? {};
    const assets  = await assetsService.getCatalog(filters);
    res.json(ok(assets));
  }),
);

// ── GET /assets/:uuid ─────────────────────────────────────────────────────────
router.get('/:uuid',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetsService.getDetail(req.params.uuid);
    res.json(ok(asset));
  }),
);

// ── GET /assets/:uuid/simulate?cells=150 ─────────────────────────────────────
router.get('/:uuid/simulate',
  asyncHandler(async (req: Request, res: Response) => {
    const cells = z.coerce.number().int().min(1).parse(req.query.cells);
    const sim   = await assetsService.simulate(req.params.uuid, cells);
    res.json(ok(sim));
  }),
);

export default router;
