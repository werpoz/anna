import { describe, it, expect } from 'bun:test';
import { startMetricsServer } from '@/contexts/Shared/infrastructure/observability/metricsServer';

describe('metricsServer', () => {
  it('serves metrics payload and 404 for unknown paths', async () => {
    const originalServe = Bun.serve;
    let handler: ((request: Request) => Response | Promise<Response>) | undefined;

    Bun.serve = ((options: { fetch: (request: Request) => Response | Promise<Response> }) => {
      handler = options.fetch;
      return { stop: () => {} } as any;
    }) as typeof Bun.serve;

    try {
      startMetricsServer(9999);
      if (!handler) {
        throw new Error('metrics handler was not registered');
      }

      const metricsResponse = await handler(new Request('http://localhost:9999/metrics'));
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.headers.get('content-type') ?? '').toContain('text/plain');

      const metricsPayload = await metricsResponse.text();
      expect(metricsPayload).toContain('events_processed_total');

      const notFoundResponse = await handler(new Request('http://localhost:9999/health'));
      expect(notFoundResponse.status).toBe(404);
    } finally {
      Bun.serve = originalServe;
    }
  });
});
