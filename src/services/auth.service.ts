import { Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword, hashToken, verifyTokenHash } from '../utils/security';
import { tokenService } from './token.service';
import { deviceService, DeviceType } from './device.service';

export type DeviceInfo = {
  type: DeviceType;
  name?: string;
};

export class AuthService {
  private async createAuditLog(userId: string | null, event: string, meta?: unknown) {
    await prisma.auditLog.create({ data: { userId, event, meta } });
  }

  private async issueTokens(user: { id: string; role: Role }, deviceId?: string) {
    const { token: refreshToken, jti } = await tokenService.signRefreshToken({ sub: user.id });
    const tokenHash = await hashToken(refreshToken);
    const refreshRecord = await prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash,
        deviceId: deviceId ?? null,
        expiresAt: new Date(Date.now() + tokenService.refreshTtlSeconds * 1000),
      },
    });

    const accessToken = await tokenService.signAccessToken({ sub: user.id, role: user.role });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: refreshRecord.expiresAt,
      refreshTokenId: refreshRecord.id,
    };
  }

  async register(input: { username?: string; email?: string; password?: string; device?: DeviceInfo }) {
    const isAnonymous = !input.password;
    if (!isAnonymous && !input.username && !input.email) {
      throw new AppError('Username or email required', 400, 'INVALID_INPUT');
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const user = await prisma.user
      .create({
        data: {
          username: input.username ?? null,
          email: input.email ?? null,
          passwordHash,
          role: isAnonymous ? Role.anonymous : Role.user,
        },
      })
      .catch((error: any) => {
        if (error.code === 'P2002') {
          throw new AppError('Username or email already in use', 409, 'CONFLICT');
        }
        throw error;
      });

    const device = input.device
      ? await deviceService.upsertDevice(user.id, input.device.type, input.device.name ?? 'unknown')
      : null;
    await this.createAuditLog(user.id, isAnonymous ? 'USER_ANON_CREATED' : 'USER_REGISTERED', {
      deviceId: device?.id,
    });

    const tokens = await this.issueTokens({ id: user.id, role: user.role }, device?.id);

    return { user, ...tokens };
  }

  async upgradeAnonymous(userId: string, input: { username?: string; email?: string; password: string }) {
    if (!input.password) {
      throw new AppError('Password required to upgrade', 400, 'INVALID_INPUT');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.anonymous) {
      throw new AppError('Only anonymous accounts can be upgraded', 400, 'INVALID_STATE');
    }
    if (!input.username && !input.email) {
      throw new AppError('Username or email required', 400, 'INVALID_INPUT');
    }

    const passwordHash = await hashPassword(input.password);
    const updated = await prisma.user
      .update({
        where: { id: userId },
        data: {
          username: input.username ?? user.username,
          email: input.email ?? user.email,
          passwordHash,
          role: Role.user,
        },
      })
      .catch((error: any) => {
        if (error.code === 'P2002') {
          throw new AppError('Username or email already in use', 409, 'CONFLICT');
        }
        throw error;
      });

    await this.createAuditLog(userId, 'USER_UPGRADED', {});
    const tokens = await this.issueTokens({ id: updated.id, role: updated.role });
    return { user: updated, ...tokens };
  }

  async login(input: { usernameOrEmail: string; password: string; device: DeviceInfo }) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.usernameOrEmail }, { email: input.usernameOrEmail }],
      },
    });

    if (!user) {
      await this.createAuditLog(null, 'LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.passwordHash) {
      await this.createAuditLog(user.id, 'LOGIN_FAILED', { reason: 'NO_PASSWORD_SET' });
      throw new AppError('Credentials not set for this account', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      await this.createAuditLog(user.id, 'LOGIN_FAILED', { reason: 'INVALID_PASSWORD' });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const device = await deviceService.upsertDevice(user.id, input.device.type, input.device.name ?? 'unknown');
    await this.createAuditLog(user.id, 'LOGIN_SUCCESS', { deviceId: device.id });

    const tokens = await this.issueTokens({ id: user.id, role: user.role }, device.id);
    return { user, ...tokens };
  }

  async refresh(input: { refreshToken: string; device?: DeviceInfo }) {
    const payload = await tokenService.verifyRefreshToken(input.refreshToken).catch(() => {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    });

    const tokenRecord = await prisma.refreshToken.findUnique({ where: { id: payload.jti }, include: { user: true } });
    if (!tokenRecord || !tokenRecord.user) {
      throw new AppError('Refresh token not found', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.revokedAt || tokenRecord.replacedById) {
      throw new AppError('Refresh token revoked', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401, 'INVALID_REFRESH_TOKEN');
    }

    const hashMatches = await verifyTokenHash(input.refreshToken, tokenRecord.tokenHash);
    if (!hashMatches) {
      throw new AppError('Refresh token mismatch', 401, 'INVALID_REFRESH_TOKEN');
    }

    const deviceId = tokenRecord.deviceId ?? undefined;
    let device = null as Awaited<ReturnType<typeof deviceService.upsertDevice>> | null;
    if (deviceId) {
      const existingDevice = await prisma.device.findUnique({ where: { id: deviceId } });
      if (existingDevice) {
        device = await prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } });
      }
    }
    if (!device && input.device) {
      device = await deviceService.upsertDevice(tokenRecord.user.id, input.device.type, input.device.name ?? 'unknown');
    }

    const tokens = await this.issueTokens({ id: tokenRecord.user.id, role: tokenRecord.user.role }, device?.id);
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date(), replacedById: tokens.refreshTokenId },
    });
    await this.createAuditLog(tokenRecord.user.id, 'TOKEN_REFRESHED', { previousTokenId: tokenRecord.id });

    return { user: tokenRecord.user, ...tokens };
  }

  async logout(input: { refreshToken: string; allDevices?: boolean }) {
    const payload = await tokenService.verifyRefreshToken(input.refreshToken).catch(() => {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    });

    const tokenRecord = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!tokenRecord) {
      throw new AppError('Refresh token not found', 401, 'INVALID_REFRESH_TOKEN');
    }

    const hashMatches = await verifyTokenHash(input.refreshToken, tokenRecord.tokenHash);
    if (!hashMatches) {
      throw new AppError('Refresh token mismatch', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.revokedAt) {
      throw new AppError('Refresh token revoked', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (input.allDevices) {
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.createAuditLog(tokenRecord.userId, 'LOGOUT_ALL', {});
      return { success: true };
    }

    await prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revokedAt: new Date() } });
    await this.createAuditLog(tokenRecord.userId, 'LOGOUT', { tokenId: tokenRecord.id });
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt,
    };
  }

  async verifyToken(token: string) {
    const payload = await tokenService.verifyAccessToken(token).catch(() => {
      throw new AppError('Invalid access token', 401, 'INVALID_TOKEN');
    });

    return payload;
  }

  async markVerification(userId: string, verified: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: { verified } });
    await this.createAuditLog(userId, verified ? 'USER_VERIFIED' : 'USER_UNVERIFIED', {});
    return updated;
  }
}

export const authService = new AuthService();
