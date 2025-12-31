import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { PinoLogger } from '@/contexts/Shared/infrastructure/Logger/PinoLogger';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';

describe('PinoLogger', () => {
  it('delegates to the underlying logger', () => {
    const originalDebug = logger.debug;
    const originalInfo = logger.info;
    const originalError = logger.error;

    const calls = {
      debug: [] as unknown[],
      info: [] as unknown[],
      error: [] as Array<{ payload: unknown; message?: string }>,
    };

    logger.debug = ((message: unknown) => {
      calls.debug.push(message);
    }) as typeof logger.debug;
    logger.info = ((message: unknown) => {
      calls.info.push(message);
    }) as typeof logger.info;
    logger.error = ((payload: unknown, message?: string) => {
      calls.error.push({ payload, message });
    }) as typeof logger.error;

    try {
      const adapter = new PinoLogger();
      adapter.debug('debug');
      adapter.info('info');
      adapter.error('boom');
      adapter.error(new Error('kaboom'));

      expect(calls.debug).toEqual(['debug']);
      expect(calls.info).toEqual(['info']);
      expect(calls.error).toHaveLength(2);
      expect(calls.error[0]?.payload).toBe('boom');
      expect(calls.error[1]?.message).toBe('kaboom');
    } finally {
      logger.debug = originalDebug;
      logger.info = originalInfo;
      logger.error = originalError;
    }
  });
});
