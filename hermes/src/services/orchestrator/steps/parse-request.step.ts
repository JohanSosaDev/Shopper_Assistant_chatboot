import type { PipelineStep } from '../pipeline.js';
import type { SessionService } from '../../session.service.js';

export function parseRequestStep(sessionService: SessionService, piiSalt: string): PipelineStep {
  return async (ctx) => {
    ctx.identityResult = await sessionService.resolveIdentity(
      {
        brand: ctx.input.brand,
        session_token: ctx.input.session_token ?? null,
        session_id: ctx.input.conversation_id,
      },
      piiSalt,
    );
  };
}
