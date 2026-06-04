import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('requestId', '');

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
  });
}, {
  name: 'request-context',
});
