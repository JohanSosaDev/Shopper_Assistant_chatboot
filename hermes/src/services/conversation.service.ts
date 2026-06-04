import { randomUUID } from 'node:crypto';
import type { TurnInput, TurnOutput } from '../models/chat.js';
import { createTurnContext } from './orchestrator/turn-context.js';
import { runPipeline } from './orchestrator/pipeline.js';
import type { PipelineStep } from './orchestrator/pipeline.js';
import type { SessionService } from './session.service.js';
import type { ComplianceService } from './compliance.service.js';
import type { BrandConfigService } from './brand-config.service.js';
import type { LoggerService } from './logger.service.js';
import type { ConversationRepo } from '../repositories/conversation.repo.js';
import type { ToolRegistry } from '../tools/tool-registry.js';

import { loadBrandConfigStep } from './orchestrator/steps/load-brand-config.step.js';
import { parseRequestStep } from './orchestrator/steps/parse-request.step.js';
import { consentGateStep } from './orchestrator/steps/consent-gate.step.js';
import { inputGuardrailsStep } from './orchestrator/steps/input-guardrails.step.js';
import { classifyIntentStep } from './orchestrator/steps/classify-intent.step.js';
import { executeToolsStep } from './orchestrator/steps/execute-tools.step.js';
import { generateResponseStep } from './orchestrator/steps/generate-response.step.js';
import { outputGuardrailsStep } from './orchestrator/steps/output-guardrails.step.js';
import { persistTurnStep } from './orchestrator/steps/persist-turn.step.js';
import { logTurnStep } from './orchestrator/steps/log-turn.step.js';

export interface ConversationService {
  handleTurn(input: TurnInput): Promise<TurnOutput>;
}

export function createConversationService(
  sessionService: SessionService,
  complianceService: ComplianceService,
  brandConfigService: BrandConfigService,
  loggerService: LoggerService,
  conversationRepo: ConversationRepo,
  toolRegistry: ToolRegistry,
  piiSalt: string,
): ConversationService {
  const steps: PipelineStep[] = [
    loadBrandConfigStep(brandConfigService),
    parseRequestStep(sessionService, conversationRepo, piiSalt),
    consentGateStep(complianceService),
    inputGuardrailsStep(),
    classifyIntentStep(),
    executeToolsStep(toolRegistry),
    generateResponseStep(),
    outputGuardrailsStep(),
    persistTurnStep(conversationRepo),
    logTurnStep(loggerService, complianceService, piiSalt),
  ];

  return {
    async handleTurn(input: TurnInput): Promise<TurnOutput> {
      const ctx = createTurnContext(input);

      await runPipeline(ctx, steps);

      return {
        turn_id: randomUUID(),
        conversation_id: ctx.input.conversation_id as any,
        text: ctx.finalResponse ?? '',
        early_exit_reason: ctx.earlyExitReason as any,
        latency_ms: Date.now() - ctx.startTime,
        handoff_triggered: false,
        intent: ctx.intent,
        confidence: ctx.confidence,
        tools_called: ctx.toolResults.map((t) => t.name),
        tokens_in: ctx.tokensIn,
        tokens_out: ctx.tokensOut,
        model_id: null,
      };
    },
  };
}
