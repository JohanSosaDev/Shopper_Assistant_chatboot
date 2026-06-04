import type { PipelineStep } from '../pipeline.js';

export function classifyIntentStep(): PipelineStep {
  return async (ctx) => {
    ctx.intent = 'order_status_query';
    ctx.confidence = 0.95;
  };
}
