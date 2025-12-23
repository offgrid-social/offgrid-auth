import { describe, it, expect } from 'vitest';
import { tokenService } from '../../src/services/token.service';
import { hashToken, verifyTokenHash } from '../../src/utils/security';

describe('token hashing', () => {
  it('hashes and verifies refresh tokens securely', async () => {
    const token = 'sample-refresh-token';
    const hash = await hashToken(token);
    expect(hash).not.toBe(token);
    expect(await verifyTokenHash(token, hash)).toBe(true);
    expect(await verifyTokenHash('other-token', hash)).toBe(false);
  });
});

describe('token rotation', () => {
  it('generates distinct refresh token IDs and verifies payload', async () => {
    const first = await tokenService.signRefreshToken({ sub: 'user-1' });
    const verifiedFirst = await tokenService.verifyRefreshToken(first.token);
    expect(verifiedFirst.jti).toBe(first.jti);

    const second = await tokenService.signRefreshToken({ sub: 'user-1' });
    expect(second.jti).not.toBe(first.jti);
    const verifiedSecond = await tokenService.verifyRefreshToken(second.token);
    expect(verifiedSecond.sub).toBe('user-1');
  });
});
