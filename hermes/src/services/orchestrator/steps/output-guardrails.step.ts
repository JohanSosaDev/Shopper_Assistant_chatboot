import type { PipelineStep } from '../pipeline.js';
import { checkOutputGuardrails } from '../../../guardrails/output.guards.js';

export function outputGuardrailsStep(): PipelineStep {
  return async (ctx) => {
    if (!ctx.finalResponse) {
      return;
    }

    const toolResult = ctx.toolResults[0]?.result as Record<string, unknown> | undefined;

    const result = checkOutputGuardrails(ctx.finalResponse, toolResult as any);

    if (result.blocked) {
      ctx.outputViolations = result.violations.map((v) => `output_${v.category}` as any);
      ctx.earlyExitReason = 'output_guardrail_block';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?';
    }
  };
}
