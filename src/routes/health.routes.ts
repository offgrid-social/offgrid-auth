import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: { tags: ['health'], response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } },
  }, async () => ({ status: 'ok' }));

  fastify.get('/ready', {
    schema: { tags: ['health'], response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } },
  }, async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  });
}
