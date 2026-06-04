import type { PipelineStep } from '../pipeline.js';
import type { SessionService } from '../../session.service.js';

export function resolveIdentityStep(sessionService: SessionService): PipelineStep {
  return async (ctx) => {
    if (!ctx.identityResult) {
      ctx.identityResult = await sessionService.resolveIdentity(
        {
          brand: ctx.input.brand,
          session_token: ctx.input.session_token ?? null,
          session_id: ctx.input.conversation_id,
        },
        '',
      );
    }
  };
}
