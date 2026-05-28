import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name:          z.string().min(2).max(100),
  email:         z.string().email(),
  password:      z.string().min(8).max(100),
  countryCode:   z.string().length(2).toUpperCase(),
  investorType:  z.enum(['retail', 'qualified', 'institutional']).default('retail'),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les CGU.' }) }),
  marketingOptin: z.boolean().default(false),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),   // aussi accepté depuis cookie
});

// ─── KYC ─────────────────────────────────────────────────────────────────────

export const kycPersonalInfoSchema = z.object({
  dateOfBirth:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  nationality:   z.string().length(2).toUpperCase(),
  phone:         z.string().min(6).max(20),
  iban:          z.string().min(10).max(34).optional(),
});

export const kycSourceOfFundsSchema = z.object({
  fundSource:   z.enum(['salary', 'savings', 'investment', 'inheritance', 'business', 'other']),
  monthlyIncome: z.enum(['<1000', '1000-3000', '3000-7000', '7000-15000', '>15000']),
});

// ─── Investment ───────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  assetUuid:       z.string().uuid(),
  cellsRequested:  z.number().int().min(1),
  paymentMethod:   z.enum(['sepa', 'card', 'stablecoin']),
});

// ─── Market ───────────────────────────────────────────────────────────────────

export const createMarketOrderSchema = z.object({
  assetUuid:     z.string().uuid(),
  direction:     z.enum(['sell', 'buy']),
  cellsOffered:  z.number().int().min(1),
  pricePerCell:  z.number().positive(),
});

// ─── Response envelopes ──────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data:    T;
}

export interface ApiError {
  success: false;
  error:   string;
  code?:   string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(error: string, code?: string, details?: unknown): ApiError {
  return { success: false, error, code, details };
}

// ─── JWT payload ──────────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  sub:         string;    // partner UUID
  partnerUuid: string;
  email:       string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub:  string;
  type: 'refresh';
}
