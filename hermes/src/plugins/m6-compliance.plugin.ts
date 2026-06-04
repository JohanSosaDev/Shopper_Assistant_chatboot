import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { ComplianceService } from '../services/compliance.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    complianceService: ComplianceService;
  }
}

export default fp<{ complianceService: ComplianceService }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('complianceService', opts.complianceService);
  },
  { name: 'm6-compliance' },
);
