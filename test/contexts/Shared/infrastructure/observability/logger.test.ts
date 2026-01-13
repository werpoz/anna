import { describe, it, expect } from 'bun:test';
import { logger, loggerHelpers } from '@/contexts/Shared/infrastructure/observability/logger';

describe('logger', () => {
  it('exposes logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.level).toBe('string');
  });

  it('supports pretty logs when enabled', async () => {
    const previousPretty = process.env.LOG_PRETTY;
    const previousEnv = process.env.NODE_ENV;

    process.env.LOG_PRETTY = 'true';
    (process.env as any).NODE_ENV = 'development';

    try {
      const module = await import(
        `@/contexts/Shared/infrastructure/observability/logger?pretty=${Date.now()}`
      );
      expect(typeof module.logger.info).toBe('function');
    } finally {
      if (previousPretty === undefined) {
        delete process.env.LOG_PRETTY;
      } else {
        process.env.LOG_PRETTY = previousPretty;
      }
      if (previousEnv === undefined) {
        delete (process.env as any).NODE_ENV;
      } else {
        (process.env as any).NODE_ENV = previousEnv;
      }
    }
  });

  it('returns null when pretty target is missing', () => {
    const resolved = loggerHelpers.resolvePrettyTarget('missing-pretty-target');
    expect(resolved).toBeNull();
  });
});
