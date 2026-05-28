import request from 'supertest';
import app     from '../src/app';

jest.mock('../src/lib/odoo-client', () => ({
  odoo: { callKw: jest.fn(), search: jest.fn(), create: jest.fn(), write: jest.fn(), read: jest.fn() },
  OdooError: class OdooError extends Error {},
}));

jest.mock('../src/lib/minio-client', () => ({
  initBuckets: jest.fn(), uploadBuffer: jest.fn(),
  getSignedUrl: jest.fn(), minioClient: {},
  kycDocumentPath: jest.fn(), mimeToExt: jest.fn(),
}));

const { odoo } = require('../src/lib/odoo-client');

const MOCK_CATALOG = [
  {
    uuid: 'asset-uuid-01', code: 'FR-PROV-01', name: 'Centrale Provence',
    slug: 'centrale-provence', state: 'financing', asset_type: 'solar_ground',
    country_code: 'FR', region: 'PACA', installed_power_mwc: 5.0,
    target_yield_rate: 0.085, cell_unit_price: 1.0,
    total_cells: 100000, cells_subscribed: 45000, cells_available: 55000,
    financing_pct: 45, distribution_frequency: 'quarterly', image_url: null,
  },
];

describe('GET /api/v1/assets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne le catalogue public', async () => {
    odoo.callKw.mockResolvedValueOnce(MOCK_CATALOG);

    const res = await request(app).get('/api/v1/assets').expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].code).toBe('FR-PROV-01');
  });

  it('accepte les filtres query', async () => {
    odoo.callKw.mockResolvedValueOnce(MOCK_CATALOG);

    const res = await request(app)
      .get('/api/v1/assets?min_yield=0.07&asset_type=solar_ground')
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/assets/:uuid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne le détail d\'un actif', async () => {
    odoo.callKw.mockResolvedValueOnce([{ id: 1 }]);    // search
    odoo.read.mockResolvedValueOnce([{ ...MOCK_CATALOG[0], description: 'Détail...' }]);

    const res = await request(app)
      .get('/api/v1/assets/asset-uuid-01')
      .expect(200);

    expect(res.body.data.uuid).toBe('asset-uuid-01');
  });

  it('retourne 404 si actif inexistant', async () => {
    odoo.callKw.mockResolvedValueOnce([]);   // pas de résultat

    await request(app)
      .get('/api/v1/assets/inexistant-uuid')
      .expect(404);
  });
});

describe('GET /api/v1/assets/:uuid/simulate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne une simulation valide', async () => {
    odoo.callKw
      .mockResolvedValueOnce([{ id: 1 }])     // search asset
      .mockResolvedValueOnce({                  // simulate_investment
        cells: 100, amount: 100, fees: 0,
        annual_revenue: 8.5, quarterly_revenue: 2.125,
        target_yield_rate: 0.085,
      });

    const res = await request(app)
      .get('/api/v1/assets/asset-uuid-01/simulate?cells=100')
      .expect(200);

    expect(res.body.data.cells).toBe(100);
    expect(res.body.data.annual_revenue).toBe(8.5);
  });

  it('retourne 400 si cells=0', async () => {
    await request(app)
      .get('/api/v1/assets/asset-uuid-01/simulate?cells=0')
      .expect(400);
  });

  it('retourne 400 si cells manquant', async () => {
    await request(app)
      .get('/api/v1/assets/asset-uuid-01/simulate')
      .expect(400);
  });
});
