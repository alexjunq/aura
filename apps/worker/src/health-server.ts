import { createServer } from 'node:http';
import { logger } from '@aura/logger';

export interface HealthServer {
  close(): void;
}

export function startHealthServer(port: number): HealthServer {
  const server = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => logger.info({ port }, 'worker health server listening'));

  return {
    close: () => server.close(),
  };
}
