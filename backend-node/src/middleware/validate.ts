import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { fail } from '../types/api.types';

type Source = 'body' | 'query' | 'params';

/**
 * Middleware de validation Zod.
 * @param schema  Schéma Zod à appliquer.
 * @param source  Source des données à valider ('body' | 'query' | 'params').
 */
export function validate<T>(schema: ZodSchema<T>, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = (result.error as ZodError).issues.map(i => ({
        field:   i.path.join('.'),
        message: i.message,
      }));
      res.status(400).json(fail('Données invalides.', 'VALIDATION_ERROR', issues));
      return;
    }
    // Remplace la source par les données parsées (transformations Zod appliquées)
    (req as Record<string, unknown>)[source] = result.data;
    next();
  };
}
