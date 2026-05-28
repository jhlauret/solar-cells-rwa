import express, { Request, Response } from 'express';
import helmet       from 'helmet';
import cors         from 'cors';
import morgan       from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit    from 'express-rate-limit';

import { env }            from './config/env';
import { logger }         from './lib/logger';
import { errorHandler }   from './middleware/error-handler';

// Routes
import authRoutes     from './routes/auth.routes';
import assetsRoutes   from './routes/assets.routes';
import kycRoutes      from './routes/kyc.routes';
import paymentsRoutes from './routes/payments.routes';
import profileRoutes  from './routes/profile.routes';
import webhookRoutes  from './routes/webhooks.routes';
import {
  portfolioRouter, investmentRouter, yieldRouter,
  transfersRouter, walletRouter,
} from './routes/dashboard.routes';

const app = express();

// ─── Sécurité ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1);  // Pour X-Forwarded-For derrière nginx/traefik

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin non autorisée: ${origin}`));
    }
  },
  credentials:      true,
  allowedHeaders:   ['Content-Type', 'Authorization'],
  exposedHeaders:   ['X-Request-Id'],
}));

// ─── Rate limiting global ─────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX,
  message:  { success: false, error: 'Trop de requêtes. Réessayez plus tard.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// Rate limit plus strict sur les routes d'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,
  message: { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.', code: 'RATE_LIMIT' },
});

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Raw buffer pour webhooks Stripe (avant JSON.parse)
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
// JSON pour tout le reste
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream: { write: (msg) => logger.info(msg.trim()) } },
));

// ─── Santé ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const prefix = env.API_PREFIX;

app.use(`${prefix}/auth`,        authLimiter, authRoutes);
app.use(`${prefix}/assets`,      assetsRoutes);
app.use(`${prefix}/kyc`,         kycRoutes);
app.use(`${prefix}/portfolio`,   portfolioRouter);
app.use(`${prefix}/investments`, investmentRouter);
app.use(`${prefix}/yield`,       yieldRouter);
app.use(`${prefix}/transfers`,   transfersRouter);
app.use(`${prefix}/wallet`,      walletRouter);
app.use(`${prefix}/payments`,     paymentsRoutes);
app.use(`${prefix}/profile`,      profileRoutes);
app.use(`${prefix}/webhooks`,    webhookRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route introuvable.', code: 'NOT_FOUND' });
});

// ─── Gestionnaire d'erreurs ───────────────────────────────────────────────────
app.use(errorHandler);

export default app;
