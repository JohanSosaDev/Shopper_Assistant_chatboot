import type { ConsentRepo } from '../repositories/consent.repo.js';
import type { ConsentDecision } from '../models/consent.js';
import type { BrandConfig } from '../models/brand-config.js';
import { anonymizePII } from '../lib/pii-anonymizer.js';

const AFFIRMATIVE = /\b(sí|si|ok|okay|dale|vale|claro|acepto|autorizo|de acuerdo|continuar|está bien|por supuesto)\b/i;
const NEGATIVE = /\b(no|nunca|rechazo|niego|no gracias|no quiero|no autorizo)\b/i;

export interface ComplianceService {
  evaluateConsent(clientText: string): ConsentDecision;
  captureConsent(
    conversationId: string,
    decision: ConsentDecision,
    brandConfig: BrandConfig,
  ): Promise<void>;
  hasGrantedConsent(conversationId: string): Promise<boolean>;
  anonymize(text: string, piiSalt: string): ReturnType<typeof anonymizePII>;
}

export function createComplianceService(consentRepo: ConsentRepo): ComplianceService {
  return {
    evaluateConsent(clientText: string): ConsentDecision {
      const trimmed = clientText.trim().toLowerCase();

      if (NEGATIVE.test(trimmed)) {
        return { granted: false, ambiguous: false, reason: null };
      }

      if (AFFIRMATIVE.test(trimmed)) {
        return { granted: true, ambiguous: false, reason: null };
      }

      return {
        granted: false,
        ambiguous: true,
        reason: `input "${clientText}" did not match affirmative or negative patterns`,
      };
    },

    async captureConsent(conversationId, decision, brandConfig) {
      await consentRepo.insert({
        conversation_id: conversationId,
        granted: decision.granted,
        policy_version: brandConfig.policy_version,
        client_text: decision.granted ? 'granted' : decision.reason ?? 'denied',
      });
    },

    async hasGrantedConsent(conversationId) {
      return consentRepo.hasGranted(conversationId);
    },

    anonymize(text, piiSalt) {
      return anonymizePII(text, piiSalt);
    },
  };
}
