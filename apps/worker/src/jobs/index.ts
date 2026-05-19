import cron from 'node-cron';
import { logger } from '@aura/logger';
import { getCommodityProvider } from '../providers/commodity/index.js';
import { getFxProvider } from '../providers/fx/index.js';
import { runCommodityFeed } from './commodity-feed.js';

/**
 * Phase 7 job registration. node-cron runs in-process; the worker
 * container restart policy is `unless-stopped` so a crashed run
 * comes back up on its own.
 *
 * Schedule: 06:00 UTC daily, per spec §7 Flow E.
 */
export function registerJobs(): void {
  const provider = getCommodityProvider();
  const fx = getFxProvider();

  cron.schedule(
    '0 6 * * *',
    () => {
      runCommodityFeed(provider, fx).catch((err) => {
        logger.fatal({ err }, 'commodity-feed run threw');
      });
    },
    { timezone: 'UTC' },
  );

  logger.info(
    { provider: provider.name, fx: fx.name },
    'jobs registered: commodity-feed @ 06:00 UTC',
  );
}
