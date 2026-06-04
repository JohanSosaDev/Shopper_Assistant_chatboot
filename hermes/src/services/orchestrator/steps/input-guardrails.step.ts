import type { PipelineStep } from '../pipeline.js';
import { checkInputGuardrails } from '../../../guardrails/input.guards.js';

export function inputGuardrailsStep(): PipelineStep {
  return async (ctx) => {
    const result = checkInputGuardrails(ctx.input.message);

    if (result.blocked) {
      ctx.inputViolations = result.violations.map((v) => `input_${v.category}` as any);
      ctx.earlyExitReason = 'input_guardrail_block';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?';
    }
  };
}
