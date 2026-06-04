import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { SessionService } from '../services/session.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    sessionService: SessionService;
  }
}

export default fp<{ sessionService: SessionService }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('sessionService', opts.sessionService);
  },
  { name: 'm4-session' },
);
