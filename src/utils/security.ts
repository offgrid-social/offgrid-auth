import bcrypt from 'bcrypt';
import crypto from 'crypto';
import ms from 'ms';
import { AppError } from './errors';
import { env } from '../config/env';

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const generateRefreshToken = () => crypto.randomBytes(64).toString('base64url');

export const hashToken = async (token: string) => {
  return bcrypt.hash(token, env.BCRYPT_SALT_ROUNDS);
};

export const verifyTokenHash = async (token: string, tokenHash: string) => {
  return bcrypt.compare(token, tokenHash);
};

export const parseDurationToSeconds = (value: string) => {
  const durationMs = ms(value);
  if (typeof durationMs !== 'number') {
    throw new AppError(`Invalid duration format: ${value}`, 500, 'INVALID_CONFIG');
  }
  return Math.floor(durationMs / 1000);
};
