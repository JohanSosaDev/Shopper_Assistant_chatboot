import type { TurnInput } from '../../models/chat.js';
import type { BrandConfig } from '../../models/brand-config.js';
import type { IdentityResult } from '../../models/identity.js';
import type { ConsentDecision } from '../../models/consent.js';
import type { ConversationState } from '../../models/conversation.js';
import type { GuardrailViolation } from '../../models/turn-log.js';
import type { PiiToken } from '../../lib/pii-anonymizer.js';

export interface TurnContext {
  input: TurnInput;
  brandConfig: BrandConfig | null;
  identityResult: IdentityResult | null;
  consentDecision: ConsentDecision | null;
  conversationState: ConversationState | null;
  inputViolations: GuardrailViolation[];
  outputViolations: GuardrailViolation[];
  intent: string | null;
  confidence: number | null;
  toolResults: Array<{ name: string; result: unknown }>;
  llmRawResponse: string | null;
  finalResponse: string | null;
  earlyExitReason: string | null;
  piiTokens: PiiToken[];
  stepTimings: Record<string, number>;
  startTime: number;
  tokensIn: number | null;
  tokensOut: number | null;
}

export function createTurnContext(input: TurnInput): TurnContext {
  return {
    input,
    brandConfig: null,
    identityResult: null,
    consentDecision: null,
    conversationState: null,
    inputViolations: [],
    outputViolations: [],
    intent: null,
    confidence: null,
    toolResults: [],
    llmRawResponse: null,
    finalResponse: null,
    earlyExitReason: null,
    piiTokens: [],
    stepTimings: {},
    startTime: Date.now(),
    tokensIn: null,
    tokensOut: null,
  };
}
