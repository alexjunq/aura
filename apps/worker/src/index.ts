import { loadEnv } from '@aura/config';
import { logger } from '@aura/logger';
import { startHealthServer } from './health-server.js';
import { registerJobs } from './jobs/index.js';

async function main(): Promise<void> {
  const env = loadEnv();
  logger.info({ port: env.WORKER_PORT }, 'worker starting');

  const server = startHealthServer(env.WORKER_PORT);
  registerJobs();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'worker shutdown initiated');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main().catch((err) => {
  logger.fatal({ err }, 'worker failed to start');
  process.exit(1);
});
