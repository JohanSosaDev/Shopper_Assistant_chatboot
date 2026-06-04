import type { FastifyRequest, FastifyReply } from 'fastify';

export function createHealthController() {
  return {
    async health(_request: FastifyRequest, reply: FastifyReply) {
      reply.send({ status: 'ok' });
    },

    async ready(request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.server.pg.query('SELECT 1');
        reply.send({ status: 'ready' });
      } catch {
        reply.status(503).send({ status: 'not_ready' });
      }
    },
  };
}
