import { odoo } from '../lib/odoo-client';

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface AssetCatalogItem {
  uuid:               string;
  code:               string;
  name:               string;
  slug:               string;
  state:              string;
  asset_type:         string;
  country_code:       string;
  region:             string;
  installed_power_mwc: number;
  target_yield_rate:  number;
  cell_unit_price:    number;
  total_cells:        number;
  cells_subscribed:   number;
  cells_available:    number;
  financing_pct:      number;
  distribution_frequency: string;
  image_url:          string | null;
}

export const assetsService = {
  async getCatalog(filters?: Record<string, unknown>): Promise<AssetCatalogItem[]> {
    return odoo.callKw<AssetCatalogItem[]>(
      'solar.asset', 'get_public_catalog', [], { filters: filters ?? {} },
    );
  },

  async getDetail(uuid: string): Promise<AssetCatalogItem & Record<string, unknown>> {
    const asset = await odoo.callKw<{ id: number }[]>(
      'solar.asset', 'search_read',
      [[['uuid', '=', uuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!asset.length) throw Object.assign(new Error('Actif introuvable.'), { status: 404 });
    const [rec] = await odoo.read<AssetCatalogItem & Record<string, unknown>>(
      'solar.asset', [asset[0].id],
    );
    return rec;
  },

  async simulate(uuid: string, cells: number): Promise<Record<string, unknown>> {
    const asset = await odoo.callKw<{ id: number }[]>(
      'solar.asset', 'search_read',
      [[['uuid', '=', uuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!asset.length) throw Object.assign(new Error('Actif introuvable.'), { status: 404 });
    return odoo.callKw('solar.asset', 'simulate_investment', [[asset[0].id], cells]);
  },
};

// ─── KYC ─────────────────────────────────────────────────────────────────────

export const kycService = {
  async getOrCreateCase(partnerUuid: string): Promise<{ uuid: string; state: string; name: string }> {
    return odoo.callKw('solar.kyc.case', 'get_or_create_for_partner', [partnerUuid]);
  },

  async registerDocument(
    caseUuid:          string,
    documentType:      string,
    minioPath:         string,
    sha256:            string,
    mimeType:          string,
    fileSizeBytes:     number,
  ): Promise<{ document_uuid: string }> {
    return odoo.callKw('solar.kyc.document', 'register_document', [
      caseUuid, documentType, minioPath, sha256, mimeType, fileSizeBytes,
    ]);
  },

  async submit(caseUuid: string): Promise<boolean> {
    const cases = await odoo.callKw<{ id: number }[]>(
      'solar.kyc.case', 'search_read',
      [[['uuid', '=', caseUuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!cases.length) throw Object.assign(new Error('Dossier KYC introuvable.'), { status: 404 });
    return odoo.callKw('solar.kyc.case', 'action_submit', [[cases[0].id]]);
  },

  async getStatus(partnerUuid: string): Promise<Record<string, unknown>> {
    const cases = await odoo.callKw<{ id: number }[]>(
      'solar.kyc.case', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid]]],
      { fields: ['id'], limit: 1 },
    );
    if (!cases.length) return { state: 'not_started' };
    const [rec] = await odoo.read<Record<string, unknown>>(
      'solar.kyc.case', [cases[0].id],
      ['uuid', 'state', 'level', 'expires_at', 'submitted_at', 'validated_at', 'document_count'],
    );
    return rec;
  },
};

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const walletService = {
  async createWallet(
    partnerUuid:     string,
    providerVaultId: string,
    address?:        string,
    walletType?:     string,
    network?:        string,
  ): Promise<{ wallet_uuid: string; state: string }> {
    return odoo.callKw('solar.wallet', 'create_wallet_for_partner', [
      partnerUuid, providerVaultId, address, walletType ?? 'custodial',
      'fireblocks', network ?? 'tempo',
    ]);
  },

  async getMyWallet(partnerUuid: string): Promise<Record<string, unknown> | null> {
    const wallets = await odoo.callKw<{ id: number }[]>(
      'solar.wallet', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid], ['state', '=', 'active']]],
      { fields: ['id'], limit: 1 },
    );
    if (!wallets.length) return null;
    const [rec] = await odoo.read<Record<string, unknown>>('solar.wallet', [wallets[0].id]);
    return rec;
  },
};

// ─── Investment ───────────────────────────────────────────────────────────────

export const investmentService = {
  async createOrder(
    partnerUuid:    string,
    assetUuid:      string,
    cellsRequested: number,
    paymentMethod:  string,
  ): Promise<Record<string, unknown>> {
    return odoo.callKw('solar.investment.order', 'create_order', [
      partnerUuid, assetUuid, cellsRequested, paymentMethod,
    ]);
  },

  async getOrders(partnerUuid: string): Promise<Record<string, unknown>[]> {
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.investment.order', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid]]],
      {
        fields: ['name', 'asset_id', 'cells_requested', 'gross_amount',
                 'net_amount', 'state', 'created_at', 'settled_at', 'payment_method'],
        order: 'created_at desc',
        limit: 50,
      },
    );
  },
};

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const portfolioService = {
  async getHoldings(partnerUuid: string): Promise<Record<string, unknown>[]> {
    const holdings = await odoo.callKw<{ id: number }[]>(
      'solar.holding', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid], ['state', '=', 'active']]],
      { fields: ['id'], order: 'last_updated_at desc' },
    );
    if (!holdings.length) return [];
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.holding', 'get_summary_dict',
      [holdings.map(h => h.id)],
    );
  },
};

// ─── Yield ────────────────────────────────────────────────────────────────────

export const yieldService = {
  async getLines(partnerUuid: string, limit = 50): Promise<Record<string, unknown>[]> {
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.yield.line', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid]]],
      {
        fields: ['distribution_id', 'asset_id', 'cells_at_distribution',
                 'amount_gross', 'amount_net', 'state', 'paid_at'],
        order: 'paid_at desc',
        limit,
      },
    );
  },
};

// ─── Market ───────────────────────────────────────────────────────────────────

export const marketService = {
  async getPublishedOrders(assetUuid?: string): Promise<Record<string, unknown>[]> {
    const domain: unknown[] = [['state', '=', 'published']];
    if (assetUuid) domain.push(['asset_id.uuid', '=', assetUuid]);
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.market.order', 'search_read',
      [domain],
      {
        fields: ['name', 'asset_id', 'direction', 'cells_offered',
                 'cells_remaining', 'price_per_cell', 'total_amount', 'expires_at'],
        order: 'created_at desc',
        limit: 100,
      },
    );
  },

  async getMyOrders(partnerUuid: string): Promise<Record<string, unknown>[]> {
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.market.order', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid]]],
      { fields: ['name', 'asset_id', 'direction', 'cells_offered',
                 'cells_remaining', 'price_per_cell', 'state', 'expires_at'],
        order: 'created_at desc', limit: 50 },
    );
  },
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactionsService = {
  async getHistory(partnerUuid: string, limit = 50): Promise<Record<string, unknown>[]> {
    const txs = await odoo.callKw<{ id: number }[]>(
      'solar.payment.transaction', 'search_read',
      [[['partner_id.x_uuid', '=', partnerUuid]]],
      { fields: ['id'], order: 'initiated_at desc', limit },
    );
    if (!txs.length) return [];
    return odoo.callKw<Record<string, unknown>[]>(
      'solar.payment.transaction', 'get_transaction_dict',
      [txs.map(t => t.id)],
    );
  },
};
