import { describe, it, expect } from 'bun:test';
import { initTelemetry } from '@/contexts/Shared/infrastructure/observability/telemetry';

describe('telemetry', () => {
  it('no-ops without endpoint and is safe to call when configured', () => {
    const previous = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    expect(() => initTelemetry('test-service')).not.toThrow();

    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';
    expect(() => initTelemetry('test-service')).not.toThrow();

    if (previous === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previous;
    }
  });
});
