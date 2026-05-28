import { Request, Response, NextFunction } from 'express';
import { OdooError }  from '../lib/odoo-client';
import { logger }     from '../lib/logger';
import { fail }       from '../types/api.types';

export function errorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  _next: NextFunction,
): void {
  logger.error(`[${req.method}] ${req.path} — ${err.message}`, {
    stack: err.stack,
    name:  err.name,
  });

  if (err instanceof OdooError) {
    const msg = err.odooError?.data?.message ?? err.message;
    // UserError (code 2) → 400, autres → 502
    const status = err.odooError?.data?.name === 'odoo.exceptions.UserError' ? 400 : 502;
    res.status(status).json(fail(msg, 'ODOO_ERROR'));
    return;
  }

  if (err.name === 'MulterError') {
    res.status(400).json(fail(err.message, 'UPLOAD_ERROR'));
    return;
  }

  // Generic
  const status = (err as Error & { status?: number }).status ?? 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Une erreur interne est survenue.'
    : err.message;

  res.status(status).json(fail(message, 'INTERNAL_ERROR'));
}

/** Wrapper pour les route handlers async — évite les try/catch répétitifs */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
