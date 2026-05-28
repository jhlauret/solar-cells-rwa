import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT:     z.coerce.number().default(3001),
  API_PREFIX: z.string().default('/api/v1'),

  // JWT
  JWT_ACCESS_SECRET:   z.string().min(32),
  JWT_REFRESH_SECRET:  z.string().min(32),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Odoo
  ODOO_URL:          z.string().url(),
  ODOO_DB:           z.string(),
  ODOO_API_USER:     z.string().email(),
  ODOO_API_PASSWORD: z.string(),

  // MinIO
  MINIO_ENDPOINT:   z.string(),
  MINIO_PORT:       z.coerce.number().default(9000),
  MINIO_USE_SSL:    z.string().transform(v => v === 'true').default('false'),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET_KYC:    z.string().default('kyc-documents'),
  MINIO_BUCKET_ASSETS: z.string().default('asset-documents'),

  // Stripe
  STRIPE_SECRET_KEY:      z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET:  z.string().startsWith('whsec_'),

  // Bridge
  BRIDGE_API_KEY:        z.string().optional(),
  BRIDGE_WEBHOOK_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX:       z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides:');
  parsed.error.issues.forEach(issue => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
