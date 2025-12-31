import { describe, it, expect } from 'bun:test';
import { Command } from '@/contexts/Shared/domain/Command';

class TestCommand extends Command {}

describe('Command', () => {
  it('can be extended', () => {
    const command = new TestCommand();
    expect(command).toBeInstanceOf(Command);
  });
});
