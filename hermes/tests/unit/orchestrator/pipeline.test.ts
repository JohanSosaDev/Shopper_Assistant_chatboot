import { describe, it, expect, vi } from 'vitest';
import { runPipeline, type PipelineStep } from '../../../src/services/orchestrator/pipeline.js';
import { createTurnContext, type TurnContext } from '../../../src/services/orchestrator/turn-context.js';

describe('runPipeline', () => {
  function createCtx(overrides?: Partial<TurnContext>): TurnContext {
    return createTurnContext({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      brand: 'patprimo',
      clientText: 'hola',
      piiSalt: 'test',
      ...overrides,
    } as any);
  }

  it('runs all steps in order', async () => {
    const ctx = createCtx();
    const order: string[] = [];

    const step1: PipelineStep = async () => { order.push('a'); };
    const step2: PipelineStep = async () => { order.push('b'); };

    await runPipeline(ctx, [step1, step2]);
    expect(order).toEqual(['a', 'b']);
  });

  it('records step timings', async () => {
    const ctx = createCtx();
    const step: PipelineStep = async () => {};

    await runPipeline(ctx, [step]);
    expect(Object.keys(ctx.stepTimings)).toHaveLength(1);
    expect(ctx.stepTimings[step.name]).toBeGreaterThanOrEqual(0);
  });

  it('stops early when earlyExitReason is set by a step', async () => {
    const ctx = createCtx();
    const spy = vi.fn();

    const step1: PipelineStep = async (c) => { c.earlyExitReason = 'blocked'; };
    const step2: PipelineStep = async () => { spy(); };

    await runPipeline(ctx, [step1, step2]);
    expect(spy).not.toHaveBeenCalled();
  });
});
