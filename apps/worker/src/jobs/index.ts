import { logger } from '@aura/logger';

/**
 * Phase 0: no jobs registered yet. Phase 7 wires the commodity-feed
 * cron with node-cron here.
 */
export function registerJobs(): void {
  logger.info('no jobs registered (Phase 0)');
}
