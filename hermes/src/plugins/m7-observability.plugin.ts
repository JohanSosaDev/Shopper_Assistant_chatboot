import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { LoggerService } from '../services/logger.service.js';
import { createHealthController } from '../controllers/health.controller.js';

declare module 'fastify' {
  interface FastifyInstance {
    loggerService: LoggerService;
  }
}

export default fp<{ loggerService: LoggerService }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('loggerService', opts.loggerService);

    const healthController = createHealthController();

    fastify.get('/health', healthController.health);
    fastify.get('/health/ready', healthController.ready);
  },
  { name: 'm7-observability' },
);
