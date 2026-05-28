import { Router, Request, Response } from 'express';
import { requireAuth }      from '../middleware/auth';
import { validate }         from '../middleware/validate';
import { asyncHandler }     from '../middleware/error-handler';
import {
  investmentService, portfolioService, yieldService,
  marketService, transactionsService, walletService,
} from '../services/odoo.service';
import { createOrderSchema, createMarketOrderSchema, ok, fail } from '../types/api.types';

// ─── Portfolio ────────────────────────────────────────────────────────────────
export const portfolioRouter = Router();

portfolioRouter.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const holdings = await portfolioService.getHoldings(req.user!.partnerUuid);
    res.json(ok({ holdings }));
  }),
);

// ─── Investments ──────────────────────────────────────────────────────────────
export const investmentRouter = Router();

investmentRouter.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const orders = await investmentService.getOrders(req.user!.partnerUuid);
    res.json(ok(orders));
  }),
);

investmentRouter.post('/',
  requireAuth,
  validate(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { assetUuid, cellsRequested, paymentMethod } = req.body as {
      assetUuid: string; cellsRequested: number; paymentMethod: string;
    };
    const result = await investmentService.createOrder(
      req.user!.partnerUuid, assetUuid, cellsRequested, paymentMethod,
    );
    res.status(201).json(ok(result));
  }),
);

// GET /investments/:uuid — polling du statut d'un ordre
investmentRouter.get('/:uuid',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { odoo: odooClient } = await import('../lib/odoo-client');
    type OrderRecord = { id: number; uuid: string; state: string; settled_at: string | null };
    const orders = await odooClient.callKw<OrderRecord[]>(
      'solar.investment.order',
      'search_read',
      [[
        ['uuid', '=', req.params.uuid],
        ['partner_id.x_uuid', '=', req.user!.partnerUuid],  // vérification sécurité
      ]],
      { fields: ['uuid', 'state', 'settled_at', 'cells_requested', 'gross_amount'], limit: 1 },
    );
    if (!orders.length) {
      res.status(404).json(fail('Ordre introuvable.', 'NOT_FOUND'));
      return;
    }
    res.json(ok(orders[0]));
  }),
);

// ─── Yield ────────────────────────────────────────────────────────────────────
export const yieldRouter = Router();

yieldRouter.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const lines = await yieldService.getLines(req.user!.partnerUuid);
    res.json(ok(lines));
  }),
);

// ─── Transfers / Market ───────────────────────────────────────────────────────
export const transfersRouter = Router();

transfersRouter.get('/history',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const txs = await transactionsService.getHistory(req.user!.partnerUuid);
    res.json(ok(txs));
  }),
);

transfersRouter.get('/market-orders',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const assetUuid = req.query.assetUuid as string | undefined;
    const orders = await marketService.getPublishedOrders(assetUuid);
    res.json(ok(orders));
  }),
);

transfersRouter.get('/market-orders/mine',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const orders = await marketService.getMyOrders(req.user!.partnerUuid);
    res.json(ok(orders));
  }),
);

transfersRouter.post('/market-orders',
  requireAuth,
  validate(createMarketOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { assetUuid, direction, cellsOffered, pricePerCell } = req.body as {
      assetUuid: string; direction: string; cellsOffered: number; pricePerCell: number;
    };
    const partner = await import('../lib/odoo-client')
      .then(m => m.odoo.callKw<{ id: number }[]>(
        'res.partner', 'search_read',
        [[['x_uuid', '=', req.user!.partnerUuid]]],
        { fields: ['id'], limit: 1 },
      ));
    const asset = await import('../lib/odoo-client')
      .then(m => m.odoo.callKw<{ id: number }[]>(
        'solar.asset', 'search_read',
        [[['uuid', '=', assetUuid]]],
        { fields: ['id'], limit: 1 },
      ));
    if (!partner.length || !asset.length) {
      res.status(404).json(fail('Investisseur ou actif introuvable.'));
      return;
    }
    const { odoo } = await import('../lib/odoo-client');
    const orderId = await odoo.create('solar.market.order', {
      partner_id:    partner[0].id,
      asset_id:      asset[0].id,
      direction,
      cells_offered: cellsOffered,
      price_per_cell: pricePerCell,
    });
    res.status(201).json(ok({ orderId }));
  }),
);

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletRouter = Router();

walletRouter.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const wallet = await walletService.getMyWallet(req.user!.partnerUuid);
    res.json(ok(wallet));
  }),
);

walletRouter.post('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { providerVaultId, address, walletType, network } = req.body as {
      providerVaultId: string; address?: string; walletType?: string; network?: string;
    };
    if (!providerVaultId) {
      res.status(400).json(fail('providerVaultId requis.'));
      return;
    }
    const result = await walletService.createWallet(
      req.user!.partnerUuid, providerVaultId, address, walletType, network,
    );
    res.status(201).json(ok(result));
  }),
);
