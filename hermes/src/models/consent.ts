// consent.ts
// ConsentRecord schema. Matches migrations/0002-consent-log.sql.
// domain-entities.md §4 + R-CONS-* rules.

import { z } from 'zod';
import {
  ConsentIdSchema,
  ConversationIdSchema,
  Iso8601Schema,
  PolicyVersionSchema,
} from './shared.js';

// ===========================================================================
// Persistence record
// ===========================================================================

export const ConsentRecordSchema = z.object({
  consent_id: ConsentIdSchema,
  conversation_id: ConversationIdSchema,
  granted: z.boolean(),
  timestamp: Iso8601Schema,
  policy_version: PolicyVersionSchema,
  /**
   * Texto exacto del cliente que se interpretó como granted/denied.
   * Auditabilidad SIC (Habeas Data). NO redactar; es necesario para sustentar
   * el consent ante autoridades.
   */
  client_text: z.string().min(1).max(500),
});

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// ===========================================================================
// Decision result (M6 captureConsent output)
// ===========================================================================

export const ConsentDecisionSchema = z.object({
  granted: z.boolean(),
  /** Si el cliente respondió ambiguamente, se intenta una vez más antes de fail. */
  ambiguous: z.boolean(),
  /** Razón legible si ambiguous=true: por ejemplo, "no matched affirmative nor negative pattern". */
  reason: z.string().nullable(),
});

export type ConsentDecision = z.infer<typeof ConsentDecisionSchema>;
