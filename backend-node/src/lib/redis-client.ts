import Redis from 'ioredis';
import { env }    from '../config/env';
import { logger } from './logger';

// ─── Singleton Redis ──────────────────────────────────────────────────────────

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect:          true,
      enableReadyCheck:     true,
    });

    redisClient.on('connect',   ()    => logger.info('[Redis] Connecté'));
    redisClient.on('error',     (err) => logger.error('[Redis] Erreur:', err.message));
    redisClient.on('reconnecting', () => logger.warn('[Redis] Reconnexion…'));
  }
  return redisClient;
}

// ─── Helpers refresh token ────────────────────────────────────────────────────

const REFRESH_PREFIX = 'refresh_token:';
const REFRESH_TTL_S  = 7 * 24 * 60 * 60;   // 7 jours en secondes

export async function setRefreshToken(
  token:       string,
  partnerUuid: string,
): Promise<void> {
  const redis = getRedis();
  await redis.setex(
    `${REFRESH_PREFIX}${token}`,
    REFRESH_TTL_S,
    partnerUuid,
  );
}

export async function getRefreshToken(token: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`${REFRESH_PREFIX}${token}`);
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${REFRESH_PREFIX}${token}`);
}

// ─── Helpers rate limiting OTP ────────────────────────────────────────────────

const OTP_ATTEMPT_PREFIX = 'otp_attempts:';
const OTP_WINDOW_S       = 15 * 60;   // fenêtre 15 minutes

/**
 * Incrémente le compteur de tentatives OTP pour une adresse IP.
 * @returns Le nombre de tentatives dans la fenêtre courante.
 */
export async function incrementOtpAttempts(ip: string): Promise<number> {
  const redis = getRedis();
  const key   = `${OTP_ATTEMPT_PREFIX}${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Premier essai de la fenêtre → fixer le TTL
    await redis.expire(key, OTP_WINDOW_S);
  }
  return count;
}

export async function resetOtpAttempts(ip: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${OTP_ATTEMPT_PREFIX}${ip}`);
}
