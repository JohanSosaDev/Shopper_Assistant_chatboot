import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { BrandConfigService } from '../services/brand-config.service.js';
import { createWidgetConfigController } from '../controllers/widget-config.controller.js';

declare module 'fastify' {
  interface FastifyInstance {
    brandConfigService: BrandConfigService;
  }
}

export default fp<{ brandConfigService: BrandConfigService }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('brandConfigService', opts.brandConfigService);

    const widgetConfigHandler = createWidgetConfigController(opts.brandConfigService);

    fastify.get('/widget/config', widgetConfigHandler);
  },
  { name: 'm8-brand-config' },
);
