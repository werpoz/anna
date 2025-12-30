import { describe, it, expect } from 'bun:test';
import {
  getMetrics,
  metricsContentType,
  metrics,
} from '@/contexts/Shared/infrastructure/observability/metrics';

describe('metrics', () => {
  it('returns metrics payload', async () => {
    const payload = await getMetrics();
    expect(payload).toContain('events_processed_total');
    expect(metricsContentType).toContain('text/plain');
  });

  it('increments counters for event metrics', async () => {
    metrics.eventsProcessed.reset();
    metrics.eventsFailed.reset();

    metrics.eventsProcessed.inc({ event_name: 'test.event' });
    metrics.eventsFailed.inc({ event_name: 'test.event' });

    const processedSnapshot = await metrics.eventsProcessed.get();
    const failedSnapshot = await metrics.eventsFailed.get();

    const processedValue = processedSnapshot.values.find(
      (value) => value.labels.event_name === 'test.event'
    )?.value;
    const failedValue = failedSnapshot.values.find(
      (value) => value.labels.event_name === 'test.event'
    )?.value;

    expect(processedValue).toBe(1);
    expect(failedValue).toBe(1);
  });
});
