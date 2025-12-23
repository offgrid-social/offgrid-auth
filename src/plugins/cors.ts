import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { corsOrigins } from '../config/env';

const origins = new Set(corsOrigins);

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }

      if (origins.size === 0) {
        cb(null, false);
        return;
      }

      if (origins.has(origin)) {
        cb(null, true);
        return;
      }

      cb(new Error('Origin not allowed by CORS'), false);
    },
  });
});
