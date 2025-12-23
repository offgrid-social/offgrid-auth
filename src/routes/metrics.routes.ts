import { FastifyInstance } from 'fastify';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/metrics',
    {
      schema: { tags: ['metrics'] },
    },
    async (request, reply) => {
      const metrics = await fastify.metricsRegistry.metrics();
      reply.header('Content-Type', fastify.metricsRegistry.contentType);
      return metrics;
    },
  );
}
