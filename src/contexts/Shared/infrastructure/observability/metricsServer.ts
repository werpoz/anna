import { getMetrics, metricsContentType } from './metrics';

export const startMetricsServer = (port: number): void => {
  Bun.serve({
    port,
    fetch: async (request) => {
      const url = new URL(request.url);
      if (url.pathname !== '/metrics') {
        return new Response('Not Found', { status: 404 });
      }

      const payload = await getMetrics();
      return new Response(payload, {
        headers: { 'content-type': metricsContentType },
      });
    },
  });
};
