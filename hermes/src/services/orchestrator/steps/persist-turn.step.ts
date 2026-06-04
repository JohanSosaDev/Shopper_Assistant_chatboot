import type { PipelineStep } from '../pipeline.js';
import type { ConversationRepo } from '../../../repositories/conversation.repo.js';

export function persistTurnStep(conversationRepo: ConversationRepo): PipelineStep {
  return async (ctx) => {
    await conversationRepo.insertTurn({
      conversation_id: ctx.input.conversation_id,
      role: 'user',
      text: ctx.input.message,
      intent: ctx.intent ?? undefined,
      confidence: ctx.confidence ?? undefined,
    });

    if (ctx.finalResponse) {
      const assistantTurn = await conversationRepo.insertTurn({
        conversation_id: ctx.input.conversation_id,
        role: 'assistant',
        text: ctx.finalResponse,
        intent: ctx.intent ?? undefined,
        confidence: ctx.confidence ?? undefined,
        latency_ms: Date.now() - ctx.startTime,
        early_exit_reason: ctx.earlyExitReason ?? undefined,
      });
      ctx.assistantTurnId = assistantTurn.turn_id;
    }
  };
}
