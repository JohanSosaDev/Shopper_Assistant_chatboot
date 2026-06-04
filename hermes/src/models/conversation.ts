// conversation.ts
// Conversation + Turn schemas. Matchean migrations/0001-init.sql.
// domain-entities.md §2 y §3.

import { z } from 'zod';
import {
  BrandIdSchema,
  ConversationIdSchema,
  CustomerIdHashSchema,
  Iso8601Schema,
  NonNegativeIntSchema,
  PolicyVersionSchema,
  TurnIdSchema,
} from './shared.js';

// ===========================================================================
// Enums (matchean ENUMs SQL en 0001-init.sql)
// ===========================================================================

export const AuthMethodSchema = z.enum(['sfcc_session', 'guest_matched', 'guest_unauth']);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export const ConversationStatusSchema = z.enum([
  'awaiting_consent',
  'active',
  'closed',
  'consent_denied',
]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const CloseReasonSchema = z.enum([
  'ttl_inactivity',
  'consent_denied',
  'client_explicit_close',
]);
export type CloseReason = z.infer<typeof CloseReasonSchema>;

export const TurnRoleSchema = z.enum(['user', 'assistant', 'system']);
export type TurnRole = z.infer<typeof TurnRoleSchema>;

export const EarlyExitReasonSchema = z.enum([
  'consent_request',
  'consent_denied',
  'input_guardrail_block',
  'output_guardrail_block',
  'tool_unavailable',
  'rate_limit',
]);
export type EarlyExitReason = z.infer<typeof EarlyExitReasonSchema>;

// ===========================================================================
// Conversation
// ===========================================================================

export const ConversationSchema = z
  .object({
    conversation_id: ConversationIdSchema,
    brand: BrandIdSchema,
    customer_id_hash: CustomerIdHashSchema.nullable(),
    auth_method: AuthMethodSchema,
    status: ConversationStatusSchema,
    started_at: Iso8601Schema,
    last_activity_at: Iso8601Schema,
    closed_at: Iso8601Schema.nullable(),
    close_reason: CloseReasonSchema.nullable(),
    policy_version: PolicyVersionSchema,
  })
  .refine(
    (c) => {
      // Invariante: status='closed' ⟹ closed_at + close_reason no nulos (domain §2)
      if (c.status === 'closed') {
        return c.closed_at !== null && c.close_reason !== null;
      }
      return true;
    },
    { message: 'closed status requires closed_at and close_reason' },
  )
  .refine((c) => new Date(c.last_activity_at) >= new Date(c.started_at), {
    message: 'last_activity_at must be >= started_at',
  });

export type Conversation = z.infer<typeof ConversationSchema>;

// ===========================================================================
// Turn
// ===========================================================================

export const TurnSchema = z
  .object({
    turn_id: TurnIdSchema,
    conversation_id: ConversationIdSchema,
    role: TurnRoleSchema,
    text: z.string().max(4000),
    intent: z.string().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    timestamp: Iso8601Schema,
    latency_ms: NonNegativeIntSchema.nullable(),
    tokens_in: NonNegativeIntSchema.nullable(),
    tokens_out: NonNegativeIntSchema.nullable(),
    model_id: z.string().nullable(),
    early_exit_reason: EarlyExitReasonSchema.nullable(),
  })
  .refine(
    (t) => {
      // role='user' ⟹ latency, tokens, model_id deben ser null (domain §3)
      if (t.role === 'user') {
        return (
          t.latency_ms === null &&
          t.tokens_in === null &&
          t.tokens_out === null &&
          t.model_id === null
        );
      }
      return true;
    },
    { message: 'role=user must not have assistant-only fields' },
  )
  .refine((t) => t.early_exit_reason === null || t.role === 'assistant', {
    message: 'early_exit_reason only valid on assistant turns',
  });

export type Turn = z.infer<typeof TurnSchema>;

// ===========================================================================
// Conversation state in memory (M4 IConversationState)
// ===========================================================================

export const ConversationStateSchema = z.object({
  conversation: ConversationSchema,
  recent_turns: z.array(TurnSchema),
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;
