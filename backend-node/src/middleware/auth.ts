import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env }  from '../config/env';
import { fail } from '../types/api.types';
import type { JwtAccessPayload } from '../types/api.types';

// Extend Express Request with typed user
declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

/**
 * Extrait et vérifie le JWT (depuis httpOnly cookie OU Authorization: Bearer).
 * Attache `req.user` si valide.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1) httpOnly cookie (prioritaire — plus sécurisé)
  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) {
    token = cookieToken;
  }

  // 2) Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    res.status(401).json(fail('Token d\'authentification manquant.', 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    if (payload.type !== 'access') {
      res.status(401).json(fail('Token invalide.', 'INVALID_TOKEN'));
      return;
    }
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json(fail('Session expirée. Veuillez vous reconnecter.', 'TOKEN_EXPIRED'));
    } else {
      res.status(401).json(fail('Token invalide.', 'INVALID_TOKEN'));
    }
  }
}

/**
 * Middleware optionnel — attache req.user si token présent, ne bloque pas si absent.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token as string | undefined
    ?? req.headers.authorization?.slice(7);

  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    } catch {
      // silent — token absent ou invalide, on continue sans user
    }
  }
  next();
}
