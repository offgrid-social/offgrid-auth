import fp from 'fastify-plugin';
import client from 'prom-client';

declare module 'fastify' {
  interface FastifyInstance {
    metricsRegistry: client.Registry;
  }
}

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export default fp(async (fastify) => {
  fastify.decorate('metricsRegistry', registry);
  fastify.addHook('onResponse', async (request, reply) => {
    httpRequestsTotal.labels(request.method, request.routerPath ?? 'unknown', String(reply.statusCode)).inc();
  });
});
