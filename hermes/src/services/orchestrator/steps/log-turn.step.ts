import { randomUUID } from 'node:crypto';
import type { PipelineStep } from '../pipeline.js';
import type { LoggerService } from '../../logger.service.js';
import type { ComplianceService } from '../../compliance.service.js';
import type { TurnLogInput } from '../../../models/turn-log.js';

export function logTurnStep(
  loggerService: LoggerService,
  complianceService: ComplianceService,
  piiSalt: string,
): PipelineStep {
  return async (ctx) => {
    if (!ctx.finalResponse) {
      return;
    }

    const anonymized = complianceService.anonymize(ctx.finalResponse, piiSalt);

    const logInput: TurnLogInput = {
      turn_id: randomUUID(),
      conversation_id: ctx.input.conversation_id,
      timestamp_iso: new Date().toISOString(),
      customer_id_hash: ctx.identityResult?.customer_id_hash ?? null,
      brand: ctx.input.brand,
      intent_classified: ctx.intent,
      tools_called: ctx.toolResults.map((t) => t.name),
      latency_ms: Date.now() - ctx.startTime,
      tokens_in: ctx.tokensIn,
      tokens_out: ctx.tokensOut,
      model_id: null,
      output_text_redacted: anonymized.text,
      sentiment_score: null,
      guardrail_violations: [...ctx.inputViolations, ...ctx.outputViolations],
      early_exit_reason: ctx.earlyExitReason,
    };

    await loggerService.logTurn(logInput, anonymized.tokens);
  };
}
