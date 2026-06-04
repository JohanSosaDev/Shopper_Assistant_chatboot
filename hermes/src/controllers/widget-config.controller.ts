import type { FastifyRequest, FastifyReply } from 'fastify';
import type { BrandConfigService } from '../services/brand-config.service.js';

export function createWidgetConfigController(brandConfigService: BrandConfigService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { brand } = request.query as { brand: string };

    if (!brand) {
      reply.status(400).send({ error: 'brand query parameter is required' });
      return;
    }

    const config = await brandConfigService.getActive(brand as any);

    reply.send({
      customerFacingName: config.customer_facing_name,
      consentRequestText: config.consent_request_text,
      consentDeniedText: config.consent_denied_text,
      neutralFallbackText: config.neutral_fallback_text,
      brand: config.brand,
      language: config.language,
      tone: config.tone,
    });
  };
}
