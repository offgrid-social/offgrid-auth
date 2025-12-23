import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server';
import { prisma } from '../../src/db/prisma';
import { tokenService } from '../../src/services/token.service';

const truncateAll = async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "RefreshToken", "Device", "AuditLog", "User" RESTART IDENTITY CASCADE');
};

describe('auth integration flow', () => {
  const app = buildServer();

  beforeAll(async () => {
    await truncateAll();
    await app.ready();
  });

  afterAll(async () => {
    await truncateAll();
    await app.close();
    await prisma.$disconnect();
  });

  it('registers, logs in, refreshes, and logs out a user', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123!',
        deviceType: 'web',
        deviceName: 'browser',
      },
    });
    expect(registerRes.statusCode).toBe(201);
    const registerBody = registerRes.json();
    expect(registerBody.accessToken).toBeTruthy();
    expect(registerBody.refreshToken).toBeTruthy();

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        usernameOrEmail: 'alice',
        password: 'Password123!',
        deviceType: 'web',
        deviceName: 'browser-2',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.json();
    const loginRefreshPayload = await tokenService.verifyRefreshToken(loginBody.refreshToken);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: loginBody.refreshToken, deviceType: 'web', deviceName: 'browser-3' },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = refreshRes.json();
    const newRefreshPayload = await tokenService.verifyRefreshToken(refreshBody.refreshToken);

    const oldTokenRecord = await prisma.refreshToken.findUnique({ where: { id: loginRefreshPayload.jti } });
    expect(oldTokenRecord?.revokedAt).not.toBeNull();
    expect(oldTokenRecord?.replacedById).toBe(newRefreshPayload.jti);

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: refreshBody.refreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);
    const logoutTokenRecord = await prisma.refreshToken.findUnique({ where: { id: newRefreshPayload.jti } });
    expect(logoutTokenRecord?.revokedAt).not.toBeNull();
  });

  it('supports anonymous registration and upgrade to account', async () => {
    const anonRes = await app.inject({ method: 'POST', url: '/auth/register', payload: {} });
    expect(anonRes.statusCode).toBe(201);
    const anonBody = anonRes.json();
    const accessPayload = await tokenService.verifyAccessToken(anonBody.accessToken);
    expect(accessPayload.role).toBe('anonymous');

    const upgradeRes = await app.inject({
      method: 'POST',
      url: '/auth/upgrade',
      payload: { username: 'bob', password: 'Password123!' },
      headers: { Authorization: `Bearer ${anonBody.accessToken}` },
    });
    expect(upgradeRes.statusCode).toBe(200);
    const upgradeBody = upgradeRes.json();
    const upgradedPayload = await tokenService.verifyAccessToken(upgradeBody.accessToken);
    expect(upgradedPayload.role).toBe('user');
  });
});
