import type { PipelineStep } from '../pipeline.js';
import type { ComplianceService } from '../../compliance.service.js';

export function consentGateStep(complianceService: ComplianceService): PipelineStep {
  return async (ctx) => {
    const conversationId = ctx.input.conversation_id;
    const brandConfig = ctx.brandConfig!;

    const hasConsent = await complianceService.hasGrantedConsent(conversationId);

    if (hasConsent) {
      return;
    }

    const decision = complianceService.evaluateConsent(ctx.input.message);

    if (decision.ambiguous) {
      ctx.earlyExitReason = 'consent_request';
      ctx.finalResponse = brandConfig.consent_request_text;
      return;
    }

    if (decision.granted) {
      await complianceService.captureConsent(conversationId, decision, brandConfig);
      return;
    }

    await complianceService.captureConsent(conversationId, decision, brandConfig);
    ctx.earlyExitReason = 'consent_denied';
    ctx.finalResponse = brandConfig.consent_denied_text;
  };
}
