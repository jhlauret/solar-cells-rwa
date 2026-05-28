import app         from './app';
import { env }    from './config/env';
import { logger } from './lib/logger';
import { initBuckets } from './lib/minio-client';
import { getRedis }    from './lib/redis-client';

async function bootstrap() {
  try {
    // Connecter Redis
    await getRedis().connect().catch(err => {
      logger.warn('[Redis] Connexion initiale échouée — retry automatique:', err.message);
    });
    logger.info('[Redis] Client initialisé');

    // Initialiser les buckets MinIO
    await initBuckets();
    logger.info('[MinIO] Buckets initialisés');

    // Démarrer le serveur
    const server = app.listen(env.PORT, () => {
      logger.info(`[Server] SolarCells backend démarré sur le port ${env.PORT}`);
      logger.info(`[Server] Env: ${env.NODE_ENV} | API: ${env.API_PREFIX}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`[Server] ${signal} reçu — arrêt gracieux…`);
      server.close(() => {
        logger.info('[Server] Serveur arrêté');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('[Server] Erreur au démarrage:', err);
    process.exit(1);
  }
}

bootstrap();
