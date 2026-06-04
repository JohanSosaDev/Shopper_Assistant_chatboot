// turn-log.ts
// TurnLogRecord schema. Matches migrations/0004-turn-log-audit.sql.
// domain-entities.md §10.
//
// REGLA CRÍTICA (R-PII-4): output_text_redacted DEBE ser tipo RedactedText.
// El compilador rechaza pasar un string crudo. Esto previene PII leak en logs
// a nivel de tipos.

import { z } from 'zod';
import {
  BrandIdSchema,
  ConversationIdSchema,
  CustomerIdHashSchema,
  Iso8601Schema,
  LogIdSchema,
  NonNegativeIntSchema,
  TurnIdSchema,
  type RedactedText,
} from './shared.js';
import { EarlyExitReasonSchema } from './conversation.js';

// ===========================================================================
// Guardrail violation labels (string union persistido en text[])
// ===========================================================================

export const GuardrailViolationSchema = z.string().regex(
  // formato 'input_<category>' o 'output_<category>'
  /^(input|output)_[a-z_]+$/,
  'Formato: input_<cat> o output_<cat>',
);

export type GuardrailViolation = z.infer<typeof GuardrailViolationSchema>;

// ===========================================================================
// TurnLogRecord (DB shape)
// ===========================================================================

export const TurnLogRecordSchema = z.object({
  log_id: LogIdSchema,
  turn_id: TurnIdSchema,
  conversation_id: ConversationIdSchema,
  timestamp_iso: Iso8601Schema,
  customer_id_hash: CustomerIdHashSchema.nullable(),
  brand: BrandIdSchema,
  intent_classified: z.string().nullable(),
  tools_called: z.array(z.string()),
  latency_ms: NonNegativeIntSchema.nullable(),
  tokens_in: NonNegativeIntSchema.nullable(),
  tokens_out: NonNegativeIntSchema.nullable(),
  model_id: z.string().nullable(),
  /**
   * Texto del turno con PII anonimizada. Validado a nivel de tipo: solo
   * el anonymizer puede producir RedactedText. Zod no puede expresar el
   * brand directamente, así que el contrato lo enforza la interface del
   * LoggerService (que solo acepta el tipo branded).
   */
  output_text_redacted: z.string(),
  sentiment_score: z.number().min(-1).max(1).nullable(),
  guardrail_violations: z.array(GuardrailViolationSchema),
  early_exit_reason: EarlyExitReasonSchema.nullable(),
});

export type TurnLogRecord = z.infer<typeof TurnLogRecordSchema>;

// ===========================================================================
// Input al LoggerService.logTurn (lo que el orchestrator construye)
// ===========================================================================
// Diferencia clave con TurnLogRecord: output_text_redacted es del tipo branded
// RedactedText, no string suelto. Esto fuerza al call site a pasar por el
// anonymizer.

export interface TurnLogInput {
  turn_id: string;
  conversation_id: string;
  timestamp_iso: string;
  customer_id_hash: string | null;
  brand: string;
  intent_classified: string | null;
  tools_called: string[];
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  model_id: string | null;
  output_text_redacted: RedactedText; // ⚠️ branded type, no string crudo
  sentiment_score: number | null;
  guardrail_violations: GuardrailViolation[];
  early_exit_reason: string | null;
}
