import client from 'prom-client';

export const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

export const metrics = {
  eventsProcessed: new client.Counter({
    name: 'events_processed_total',
    help: 'Total number of events processed successfully',
    labelNames: ['event_name'],
    registers: [registry],
  }),
  eventsFailed: new client.Counter({
    name: 'events_failed_total',
    help: 'Total number of events that failed processing',
    labelNames: ['event_name'],
    registers: [registry],
  }),
  eventProcessingDuration: new client.Histogram({
    name: 'event_processing_duration_ms',
    help: 'Event processing duration in milliseconds',
    labelNames: ['event_name'],
    buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [registry],
  }),
  outboxDispatchTotal: new client.Counter({
    name: 'outbox_dispatch_total',
    help: 'Total number of outbox events dispatched to streams',
    labelNames: ['event_name'],
    registers: [registry],
  }),
  outboxDispatchFailed: new client.Counter({
    name: 'outbox_dispatch_failed_total',
    help: 'Total number of outbox dispatch failures',
    labelNames: ['event_name'],
    registers: [registry],
  }),
  outboxDispatchDuration: new client.Histogram({
    name: 'outbox_dispatch_duration_ms',
    help: 'Outbox dispatch duration in milliseconds',
    labelNames: ['event_name'],
    buckets: [10, 25, 50, 100, 250, 500, 1000],
    registers: [registry],
  }),
};

export const metricsContentType = registry.contentType;

export const getMetrics = async (): Promise<string> => {
  return registry.metrics();
};
