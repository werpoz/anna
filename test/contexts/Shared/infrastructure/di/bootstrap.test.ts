import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { container } from 'tsyringe';

const poolCalls: Array<{ connectionString?: string }> = [];
const redisCalls: Array<string> = [];

class FakePool {
  public options: { connectionString?: string };

  constructor(options: { connectionString?: string }) {
    this.options = options;
    poolCalls.push(options);
  }
}

class FakeRedis {
  public url: string;

  constructor(url: string) {
    this.url = url;
    redisCalls.push(url);
  }
}

mock.module('pg', () => ({ Pool: FakePool }));
mock.module('ioredis', () => ({ default: FakeRedis }));

beforeEach(() => {
  container.reset();
  poolCalls.length = 0;
  redisCalls.length = 0;
});

afterEach(() => {
  container.reset();
});

describe('bootstrap', () => {
  it('builds app context and registers core services', async () => {
    const { buildAppContext } = await import('@/contexts/Shared/infrastructure/di/bootstrap');

    const context = buildAppContext();

    expect(context.commandBus).toBeDefined();
    expect(context.queryBus).toBeDefined();
    expect(context.authService).toBeDefined();
    expect(poolCalls).toHaveLength(1);
    expect(redisCalls).toHaveLength(1);
    expect(typeof poolCalls[0]?.connectionString).toBe('string');
  });
});
