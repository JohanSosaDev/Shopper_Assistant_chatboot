import type { PipelineStep } from '../pipeline.js';
import type { SessionService } from '../../session.service.js';
import type { ConversationRepo } from '../../../repositories/conversation.repo.js';
import type { BrandId } from '../../../models/shared.js';

export function parseRequestStep(
  sessionService: SessionService,
  conversationRepo: ConversationRepo,
  piiSalt: string,
): PipelineStep {
  return async (ctx) => {
    ctx.identityResult = await sessionService.resolveIdentity(
      {
        brand: ctx.input.brand,
        session_token: ctx.input.session_token ?? null,
        session_id: ctx.input.conversation_id,
      },
      piiSalt,
    );

    await conversationRepo.ensureExists({
      conversation_id: ctx.input.conversation_id,
      brand: ctx.input.brand as BrandId,
      auth_method: ctx.identityResult.auth_method,
      policy_version: ctx.brandConfig!.policy_version,
      customer_id_hash: ctx.identityResult.customer_id_hash ?? undefined,
    });
  };
}
