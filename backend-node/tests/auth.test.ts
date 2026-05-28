import request from 'supertest';
import app     from '../src/app';

// Mock Odoo client pour les tests
jest.mock('../src/lib/odoo-client', () => ({
  odoo: {
    callKw:  jest.fn(),
    search:  jest.fn(),
    create:  jest.fn(),
    write:   jest.fn(),
    read:    jest.fn(),
  },
  OdooError: class OdooError extends Error {
    constructor(message: string) { super(message); this.name = 'OdooError'; }
  },
}));

jest.mock('../src/lib/minio-client', () => ({
  initBuckets:  jest.fn(),
  uploadBuffer: jest.fn(),
  getSignedUrl: jest.fn(),
  minioClient:  {},
  kycDocumentPath: jest.fn(),
  mimeToExt:       jest.fn(),
}));

const { odoo } = require('../src/lib/odoo-client');

const VALID_REGISTER = {
  name:           'Test Investor',
  email:          'test@example.com',
  password:       'Password123!',
  countryCode:    'FR',
  investorType:   'retail',
  termsAccepted:  true,
  marketingOptin: false,
};

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crée un compte et retourne 201 avec cookies', async () => {
    odoo.search.mockResolvedValueOnce([{ id: 75 }]);  // pays FR
    odoo.callKw.mockResolvedValueOnce({ uuid: 'test-uuid-001', partner_id: 42 });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_REGISTER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.partnerUuid).toBe('test-uuid-001');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('retourne 400 si email invalide', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER, email: 'not-an-email' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('retourne 400 si password trop court', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER, password: '123' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('retourne 400 si termsAccepted manquant', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER, termsAccepted: false })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne 200 + cookies sur succès', async () => {
    odoo.search.mockResolvedValueOnce([{
      id: 42, x_uuid: 'test-uuid', email: 'test@example.com', x_account_state: 'active',
    }]);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('retourne 401 si email inconnu', async () => {
    odoo.search.mockResolvedValueOnce([]);   // aucun partner trouvé

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unknown@example.com', password: 'pass' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('retourne 403 pour compte suspendu', async () => {
    odoo.search.mockResolvedValueOnce([{
      id: 99, x_uuid: 'susp-uuid', email: 'susp@x.com', x_account_state: 'suspended',
    }]);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'susp@x.com', password: 'Pass1234' })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/v1/auth/me').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('retourne les infos du user authentifié', async () => {
    odoo.search.mockResolvedValueOnce([{ id: 75 }]);
    odoo.callKw.mockResolvedValueOnce({ uuid: 'me-uuid', partner_id: 1 });

    // S'inscrire pour obtenir un cookie
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER, email: 'me@test.com' });

    const cookie = register.headers['set-cookie'];

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.partnerUuid).toBeDefined();
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('efface les cookies', async () => {
    odoo.search.mockResolvedValueOnce([{ id: 75 }]);
    odoo.callKw.mockResolvedValueOnce({ uuid: 'logout-uuid', partner_id: 1 });

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER, email: 'logout@test.com' });

    const cookie = register.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.data.loggedOut).toBe(true);
  });
});

describe('GET /health', () => {
  it('retourne 200 ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
