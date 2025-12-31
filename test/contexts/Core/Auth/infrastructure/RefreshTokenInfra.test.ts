import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { CryptoRefreshTokenHasher } from '@/contexts/Core/Auth/infrastructure/CryptoRefreshTokenHasher';
import { CryptoRefreshTokenGenerator } from '@/contexts/Core/Auth/infrastructure/CryptoRefreshTokenGenerator';
import { InMemoryRefreshTokenRepository } from '@/contexts/Core/Auth/infrastructure/InMemoryRefreshTokenRepository';


describe('Refresh token infrastructure', () => {
  it('hashes tokens deterministically', () => {
    const hasher = new CryptoRefreshTokenHasher();
    const hash1 = hasher.hash('token');
    const hash2 = hasher.hash('token');
    const hash3 = hasher.hash('other');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('generates random refresh tokens', () => {
    const generator = new CryptoRefreshTokenGenerator();
    const token = generator.generate();

    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('stores, finds, and revokes refresh tokens', async () => {
    const repository = new InMemoryRefreshTokenRepository();

    await repository.create({
      tokenHash: 'hash-1',
      userId: 'user-1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-02-01T00:00:00.000Z'),
      revokedAt: null,
      replacedByTokenHash: null,
    });

    const stored = await repository.findByTokenHash('hash-1');
    expect(stored?.userId).toBe('user-1');

    await repository.revoke('hash-1', 'hash-2');
    const revoked = await repository.findByTokenHash('hash-1');
    expect(revoked?.revokedAt).not.toBeNull();
    expect(revoked?.replacedByTokenHash).toBe('hash-2');
  });

  it('revokes all tokens for user', async () => {
    const repository = new InMemoryRefreshTokenRepository();

    await repository.create({
      tokenHash: 'hash-1',
      userId: 'user-1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-02-01T00:00:00.000Z'),
      revokedAt: null,
      replacedByTokenHash: null,
    });
    await repository.create({
      tokenHash: 'hash-2',
      userId: 'user-1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-02-01T00:00:00.000Z'),
      revokedAt: null,
      replacedByTokenHash: null,
    });

    await repository.revokeAllForUser('user-1');

    const first = await repository.findByTokenHash('hash-1');
    const second = await repository.findByTokenHash('hash-2');

    expect(first?.revokedAt).not.toBeNull();
    expect(second?.revokedAt).not.toBeNull();
  });
});
