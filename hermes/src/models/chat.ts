// chat.ts
// Schemas del endpoint POST /chat y del input/output del orchestrator M1.
// business-logic-model.md pipeline 14-step.

import { z } from 'zod';
import { BrandIdSchema, ConversationIdSchema, NonNegativeIntSchema } from './shared.js';
import { EarlyExitReasonSchema } from './conversation.js';

// ===========================================================================
// POST /chat request body
// ===========================================================================

export const ChatRequestSchema = z.object({
  /** UUID v4 generado client-side al iniciar la conversación. */
  conversation_id: z.string().uuid(),
  brand: BrandIdSchema,
  /** Texto del cliente. Max 4000 chars (R-GUARD-IN); el server trunca si excede. */
  message: z.string().min(1).max(4000),
  /** Si SFCC inyectó sesión en el storefront, viene acá. */
  session_token: z.string().nullable().optional(),
  /** Origen del mensaje. 'handoff_button' bypasea pipeline (Unit 3). En Unit 1 siempre 'chat'. */
  source: z.enum(['chat', 'handoff_button']).default('chat'),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ===========================================================================
// POST /chat response body
// ===========================================================================

export const ChatResponseSchema = z.object({
  /** UUID del turno assistant generado. */
  turn_id: z.string().uuid(),
  conversation_id: ConversationIdSchema,
  /** Texto del bot al cliente. Ya pasó por output guardrails y PII anonymization no aplica (cleartext al cliente). */
  text: z.string(),
  /** Si la pipeline terminó temprano, indica la razón. */
  early_exit_reason: EarlyExitReasonSchema.nullable(),
  /** Latencia end-to-end del turno en ms. */
  latency_ms: NonNegativeIntSchema,
  /** Si el bot decidió que el siguiente paso es handoff (Unit 3 lo activa). */
  handoff_triggered: z.boolean(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ===========================================================================
// Internal — TurnInput / TurnOutput del IConversationService.handleTurn
// ===========================================================================

export const TurnInputSchema = ChatRequestSchema.extend({
  /** Correlation id del request HTTP (CC-3). */
  request_id: z.string().uuid(),
  /** Timestamp de arrival del request en server. */
  arrived_at: z.string().datetime(),
});

export type TurnInput = z.infer<typeof TurnInputSchema>;

export const TurnOutputSchema = ChatResponseSchema.extend({
  /** Intent clasificado por el LLM. Null si guardrail bloqueó antes de classify. */
  intent: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  tools_called: z.array(z.string()),
  tokens_in: NonNegativeIntSchema.nullable(),
  tokens_out: NonNegativeIntSchema.nullable(),
  model_id: z.string().nullable(),
});

export type TurnOutput = z.infer<typeof TurnOutputSchema>;
