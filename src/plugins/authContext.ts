import fp from 'fastify-plugin';
import { tokenService, AccessTokenPayload } from '../services/token.service';
import { AppError } from '../utils/errors';
import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

export const authenticate = async (request: FastifyRequest) => {
  const authorization = request.headers['authorization'];
  if (!authorization || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const token = authorization.substring('Bearer '.length);
  try {
    const payload = await tokenService.verifyAccessToken(token);
    request.user = payload;
  } catch (err) {
    throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
  }
};

export default fp(async (fastify) => {
  fastify.decorateRequest('user', null);
});
