import Fastify, { type FastifyInstance } from 'fastify';
import { loadEnv } from './config/env.js';
import postgresPlugin from './plugins/postgres.plugin.js';
// import bedrockPlugin from './plugins/bedrock.plugin.js'; // Demo Day: deshabilitado (classify+generate hardcoded, sin LLM real). @anthropic-ai/bedrock-sdk@0.12.0 tiene incompatibilidad de exports con @anthropic-ai/sdk anidado.
import errorHandlerPlugin from './plugins/error-handler.plugin.js';
import requestContextPlugin from './plugins/request-context.plugin.js';
import securityPlugin from './plugins/security.plugin.js';
import m4SessionPlugin from './plugins/m4-session.plugin.js';
import m6CompliancePlugin from './plugins/m6-compliance.plugin.js';
import m8BrandConfigPlugin from './plugins/m8-brand-config.plugin.js';
import m3SfccPlugin from './plugins/m3-sfcc.plugin.js';
import m7ObservabilityPlugin from './plugins/m7-observability.plugin.js';
import m1ConversationPlugin from './plugins/m1-conversation.plugin.js';
import { registerWidgetStaticRoutes } from './controllers/widget-static.controller.js';

import { createConversationRepo } from './repositories/conversation.repo.js';
import { createConsentRepo } from './repositories/consent.repo.js';
import { createTurnLogRepo } from './repositories/turn-log.repo.js';
import { createBrandConfigRepo } from './repositories/brand-config.repo.js';
import { createRateLimitRepo } from './repositories/rate-limit.repo.js';

import { createSessionService } from './services/session.service.js';
import { createComplianceService } from './services/compliance.service.js';
import { createBrandConfigService } from './services/brand-config.service.js';
import { createLoggerService } from './services/logger.service.js';
import { createKnowledgeService } from './services/knowledge.service.js';
import { createConversationService } from './services/conversation.service.js';

import { createToolRegistry } from './tools/tool-registry.js';
import { createSfccClient } from './tools/sfcc/sfcc-client.js';
import { createGetOrderStatusTool } from './tools/sfcc/get-order-status.tool.js';
import { createSearchProductsTool } from './tools/sfcc/search-products.tool.js';

import { registerJobs } from './jobs/job-runner.js';
import { createSessionCleanupJob } from './jobs/session-cleanup.job.js';
import { createRetentionJob } from './jobs/retention.job.js';

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(requestContextPlugin);

  await app.register(postgresPlugin, {
    connectionString: env.DATABASE_URL,
  });

  // await app.register(bedrockPlugin, { ... }); // Demo Day: ver comentario en import arriba.

  await app.register(errorHandlerPlugin);

  await app.register(securityPlugin, {
    allowedOrigins: env.ALLOWED_ORIGINS.split(','),
    rateLimitMax: env.RATE_LIMIT_IP_MAX,
    rateLimitTimeWindow: '1 minute',
  });

  const conversationRepo = createConversationRepo(app.pg);
  const consentRepo = createConsentRepo(app.pg);
  const turnLogRepo = createTurnLogRepo(app.pg);
  const brandConfigRepo = createBrandConfigRepo(app.pg);
  createRateLimitRepo(app.pg);

  const sessionService = createSessionService(conversationRepo);
  const complianceService = createComplianceService(consentRepo);
  const brandConfigService = createBrandConfigService(brandConfigRepo);
  const loggerService = createLoggerService(turnLogRepo);
  createKnowledgeService();

  const sfccClient = await createSfccClient(env.SFCC_MODE, {
    baseUrl: env.SFCC_BASE_URL,
    clientId: env.SFCC_CLIENT_ID,
    clientSecret: env.SFCC_CLIENT_SECRET,
    fixturesPath: undefined,
  });

  const toolRegistry = createToolRegistry();
  const getOrderStatusTool = createGetOrderStatusTool(sfccClient);
  toolRegistry.register(getOrderStatusTool);
  const searchProductsTool = createSearchProductsTool(sfccClient);
  toolRegistry.register(searchProductsTool);

  const conversationService = createConversationService(
    sessionService,
    complianceService,
    brandConfigService,
    loggerService,
    conversationRepo,
    toolRegistry,
    env.PII_SALT,
  );

  await app.register(m3SfccPlugin, { toolRegistry });
  await app.register(m4SessionPlugin, { sessionService });
  await app.register(m6CompliancePlugin, { complianceService });
  await app.register(m8BrandConfigPlugin, { brandConfigService });
  await app.register(m7ObservabilityPlugin, { loggerService });
  await app.register(m1ConversationPlugin, { conversationService });

  await registerWidgetStaticRoutes(app);

  registerJobs(app, [
    createSessionCleanupJob(conversationRepo),
    createRetentionJob(app.pg),
  ]);

  return app;
}
