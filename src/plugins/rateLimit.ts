import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env';

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    allowList: [],
    keyGenerator: (request) => request.ip,
    global: false,
  });
});
