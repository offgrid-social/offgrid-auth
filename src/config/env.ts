import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.string().default('info'),
  REQUEST_BODY_LIMIT: z.string().default('1mb'),
  CORS_ORIGINS: z.string().default(''),
  RATE_LIMIT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_TIME_WINDOW: z.string().default('1 minute'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  JWT_ISSUER: z.string().default('offgrid-auth'),
  JWT_AUDIENCE: z.string().default('offgrid-clients'),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
