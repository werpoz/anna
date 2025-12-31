import { describe, it, expect } from 'bun:test';
import { JwtAccessTokenSigner } from '@/contexts/Core/Auth/infrastructure/JwtAccessTokenSigner';
import { jwtVerify } from 'jose';


describe('JwtAccessTokenSigner', () => {
  it('signs access tokens with subject and email', async () => {
    const signer = new JwtAccessTokenSigner('secret');
    const token = await signer.sign('user-1', 'ada@example.com', 60);

    const { payload } = await jwtVerify(token, new TextEncoder().encode('secret'));

    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('ada@example.com');
    expect(payload.tokenUse).toBe('access');
    expect(typeof payload.exp).toBe('number');
  });
});
