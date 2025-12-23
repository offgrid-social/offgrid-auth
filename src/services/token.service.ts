import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { parseDurationToSeconds } from '../utils/security';

export type AccessTokenPayload = {
  sub: string;
  role: Role;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

const algorithm = 'RS256';

class TokenService {
  private privateKeyPromise = importPKCS8(env.JWT_PRIVATE_KEY, algorithm);
  private publicKeyPromise = importSPKI(env.JWT_PUBLIC_KEY, algorithm);
  private accessTokenTtlSeconds = parseDurationToSeconds(env.ACCESS_TOKEN_EXPIRES_IN);
  private refreshTokenTtlSeconds = parseDurationToSeconds(env.REFRESH_TOKEN_EXPIRES_IN);

  get refreshTtlSeconds() {
    return this.refreshTokenTtlSeconds;
  }

  async signAccessToken(payload: AccessTokenPayload) {
    const privateKey = await this.privateKeyPromise;
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: algorithm })
      .setSubject(payload.sub)
      .setIssuedAt(now)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setExpirationTime(now + this.accessTokenTtlSeconds)
      .sign(privateKey);
  }

  async signRefreshToken(payload: Omit<RefreshTokenPayload, 'jti'> & { jti?: string }) {
    const privateKey = await this.privateKeyPromise;
    const now = Math.floor(Date.now() / 1000);
    const jti = payload.jti ?? randomUUID();
    return {
      token: await new SignJWT({ sub: payload.sub, jti })
        .setProtectedHeader({ alg: algorithm })
        .setSubject(payload.sub)
        .setIssuedAt(now)
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_AUDIENCE)
        .setExpirationTime(now + this.refreshTokenTtlSeconds)
        .sign(privateKey),
      jti,
    };
  }

  async verifyAccessToken(token: string) {
    const publicKey = await this.publicKeyPromise;
    const verified = await jwtVerify<AccessTokenPayload>(token, publicKey, {
      algorithms: [algorithm],
      audience: env.JWT_AUDIENCE,
      issuer: env.JWT_ISSUER,
    });
    return verified.payload;
  }

  async verifyRefreshToken(token: string) {
    const publicKey = await this.publicKeyPromise;
    const verified = await jwtVerify<RefreshTokenPayload>(token, publicKey, {
      algorithms: [algorithm],
      audience: env.JWT_AUDIENCE,
      issuer: env.JWT_ISSUER,
    });
    return verified.payload;
  }
}

export const tokenService = new TokenService();
