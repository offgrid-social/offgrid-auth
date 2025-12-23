import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import { randomUUID } from 'crypto';
import { env } from './config/env';
import cors from './plugins/cors';
import swagger from './plugins/swagger';
import rateLimit from './plugins/rateLimit';
import metrics from './plugins/metrics';
import authContext from './plugins/authContext';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { metricsRoutes } from './routes/metrics.routes';
import { errorHandler } from './utils/errors';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

const parseBodyLimit = (value: string) => {
  const match = value.toLowerCase().trim().match(/^(\d+(?:\.\d+)?)(kb|mb|gb)?$/);
  if (!match) return 1048576; // 1mb default
  const amount = parseFloat(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'gb':
      return Math.floor(amount * 1024 * 1024 * 1024);
    case 'mb':
      return Math.floor(amount * 1024 * 1024);
    case 'kb':
      return Math.floor(amount * 1024);
    default:
      return Math.floor(amount);
  }
};

export const buildServer = () => {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
      : undefined,
    },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
    bodyLimit: parseBodyLimit(env.REQUEST_BODY_LIMIT),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler(errorHandler);

  app.register(authContext);
  app.register(cors);
  app.register(helmet, { contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false });
  app.register(rateLimit);
  app.register(swagger);
  app.register(metrics);

  app.register(healthRoutes);
  app.register(metricsRoutes);
  app.register(authRoutes);

  return app;
};
