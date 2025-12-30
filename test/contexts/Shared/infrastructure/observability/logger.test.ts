import { describe, it, expect } from 'bun:test';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';

describe('logger', () => {
  it('exposes logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.level).toBe('string');
  });
});
