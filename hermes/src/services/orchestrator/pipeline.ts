import type { TurnContext } from './turn-context.js';

export type PipelineStep = (ctx: TurnContext) => Promise<void>;

export async function runPipeline(ctx: TurnContext, steps: PipelineStep[]): Promise<void> {
  for (const step of steps) {
    const stepStart = Date.now();
    const name = step.name;

    await step(ctx);

    ctx.stepTimings[name] = Date.now() - stepStart;

    if (ctx.earlyExitReason) {
      return;
    }
  }
}
