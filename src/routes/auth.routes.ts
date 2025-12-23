import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authenticate } from '../plugins/authContext';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const roleEnum = z.enum(['anonymous', 'user', 'contributor', 'hardware_supporter', 'admin']);
const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  email: z.string().email().nullable(),
  role: roleEnum,
  verified: z.boolean(),
  createdAt: z.date(),
});

export async function authRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        body: z.object({
          username: z.string().min(3).optional(),
          email: z.string().email().optional(),
          password: z.string().min(8).optional(),
          deviceType: z.enum(['cli', 'web', 'mobile']).optional(),
          deviceName: z.string().optional(),
        }),
        response: {
          201: z.object({
            user: userSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenExpiresAt: z.date(),
          }),
        },
      },
      config: { rateLimit: { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_TIME_WINDOW } },
    },
    async (request, reply) => {
      const { username, email, password, deviceName, deviceType } = request.body;
      const result = await authService.register({
        username,
        email,
        password,
        device: deviceType ? { name: deviceName, type: deviceType } : undefined,
      });
      return reply.code(201).send({
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          verified: result.user.verified,
          createdAt: result.user.createdAt,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      });
    },
  );

  fastify.post(
    '/auth/upgrade',
    {
      preHandler: authenticate,
      schema: {
        tags: ['auth'],
        body: z.object({
          username: z.string().min(3).optional(),
          email: z.string().email().optional(),
          password: z.string().min(8),
        }),
        response: {
          200: z.object({
            user: userSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenExpiresAt: z.date(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const userId = request.user?.sub;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const result = await authService.upgradeAnonymous(userId, request.body);
      return {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          verified: result.user.verified,
          createdAt: result.user.createdAt,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      };
    },
  );

  fastify.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        body: z.object({
          usernameOrEmail: z.string(),
          password: z.string().min(8),
          deviceType: z.enum(['cli', 'web', 'mobile']).default('web'),
          deviceName: z.string().optional(),
        }),
        response: {
          200: z.object({
            user: userSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenExpiresAt: z.date(),
          }),
        },
      },
      config: { rateLimit: { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_TIME_WINDOW } },
    },
    async (request) => {
      const { usernameOrEmail, password, deviceName, deviceType } = request.body;
      const result = await authService.login({ usernameOrEmail, password, device: { name: deviceName, type: deviceType } });
      return {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          verified: result.user.verified,
          createdAt: result.user.createdAt,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      };
    },
  );

  fastify.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        body: z.object({
          refreshToken: z.string(),
          deviceType: z.enum(['cli', 'web', 'mobile']).optional(),
          deviceName: z.string().optional(),
        }),
        response: {
          200: z.object({
            user: userSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenExpiresAt: z.date(),
          }),
        },
      },
    },
    async (request) => {
      const { refreshToken, deviceName, deviceType } = request.body;
      const result = await authService.refresh({
        refreshToken,
        device: deviceType ? { name: deviceName, type: deviceType } : undefined,
      });
      return {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          verified: result.user.verified,
          createdAt: result.user.createdAt,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      };
    },
  );

  fastify.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        body: z.object({
          refreshToken: z.string(),
          allDevices: z.boolean().optional(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request) => {
      const { refreshToken, allDevices } = request.body;
      return authService.logout({ refreshToken, allDevices });
    },
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: authenticate,
      schema: {
        tags: ['auth'],
        response: {
          200: userSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const userId = request.user?.sub;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      return authService.getProfile(userId);
    },
  );

  fastify.post(
    '/auth/verify-token',
    {
      schema: {
        tags: ['auth'],
        body: z.object({ token: z.string() }),
        response: { 200: z.object({ valid: z.boolean(), payload: z.any() }) },
      },
    },
    async (request) => {
      const { token } = request.body;
      const payload = await authService.verifyToken(token);
      return { valid: true, payload };
    },
  );
}
