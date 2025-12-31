import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { ConsoleLogger } from '@/contexts/Shared/infrastructure/Logger/ConsoleLogger';

describe('ConsoleLogger', () => {
  it('writes to console methods', () => {
    const originalDebug = console.debug;
    const originalInfo = console.info;
    const originalError = console.error;

    const calls = {
      debug: [] as unknown[],
      info: [] as unknown[],
      error: [] as unknown[],
    };

    console.debug = ((message: unknown) => {
      calls.debug.push(message);
    }) as typeof console.debug;
    console.info = ((message: unknown) => {
      calls.info.push(message);
    }) as typeof console.info;
    console.error = ((message: unknown) => {
      calls.error.push(message);
    }) as typeof console.error;

    try {
      const adapter = new ConsoleLogger();
      adapter.debug('debug');
      adapter.info('info');
      adapter.error('error');

      expect(calls.debug).toEqual(['debug']);
      expect(calls.info).toEqual(['info']);
      expect(calls.error).toEqual(['error']);
    } finally {
      console.debug = originalDebug;
      console.info = originalInfo;
      console.error = originalError;
    }
  });
});
