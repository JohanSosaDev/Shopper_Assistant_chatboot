// shared.ts
// Branded types y primitivos compartidos por todos los modelos.
// nfr-design-patterns.md §6.3 — branded types previenen confusiones a nivel de tipos.

import { z } from 'zod';

// ===========================================================================
// Branded type helper
// ===========================================================================

/**
 * Marca un tipo string con un brand symbol para diferenciarlo a nivel de tipos
 * de otros strings semánticamente distintos. Cero costo en runtime.
 *
 * @example
 *   type ConversationId = Branded<string, 'ConversationId'>;
 *   const id: ConversationId = asBranded<ConversationId>('uuid-here');
 */
export type Branded<T, B extends string> = T & { readonly __brand: B };

/**
 * Cast controlado a un branded type. Usar solo en boundary code (parsing,
 * DB read) donde ya validaste el valor. No usar en business logic.
 */
export function asBranded<B>(value: string): B {
  return value as B;
}

// ===========================================================================
// Identifiers (UUIDs)
// ===========================================================================

export const UuidSchema = z.string().uuid();

export type ConversationId = Branded<string, 'ConversationId'>;
export type TurnId = Branded<string, 'TurnId'>;
export type ConsentId = Branded<string, 'ConsentId'>;
export type ToolCallId = Branded<string, 'ToolCallId'>;
export type GuardrailEventId = Branded<string, 'GuardrailEventId'>;
export type PiiMapId = Branded<string, 'PiiMapId'>;
export type LogId = Branded<string, 'LogId'>;

export const ConversationIdSchema = UuidSchema.transform((v) => v as ConversationId);
export const TurnIdSchema = UuidSchema.transform((v) => v as TurnId);
export const ConsentIdSchema = UuidSchema.transform((v) => v as ConsentId);
export const ToolCallIdSchema = UuidSchema.transform((v) => v as ToolCallId);
export const GuardrailEventIdSchema = UuidSchema.transform((v) => v as GuardrailEventId);
export const PiiMapIdSchema = UuidSchema.transform((v) => v as PiiMapId);
export const LogIdSchema = UuidSchema.transform((v) => v as LogId);

// ===========================================================================
// Brand identifier (PASH SAS portfolio)
// ===========================================================================

export const BrandIdSchema = z.enum(['patprimo', 'sevenseven', 'ostu', 'atmos']);
export type BrandId = z.infer<typeof BrandIdSchema>;

// ===========================================================================
// Customer identity hashing (SECURITY-13)
// ===========================================================================

/**
 * Hash sha256(sfcc_customer_id + PII_SALT). NUNCA contiene el customer_id raw.
 * Tipo branded para prevenir que un agente pase customer_id raw donde se espera hash.
 */
export type CustomerIdHash = Branded<string, 'CustomerIdHash'>;

export const CustomerIdHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/i, 'CustomerIdHash debe ser sha256 hex (64 chars)')
  .transform((v) => v as CustomerIdHash);

// ===========================================================================
// Redacted text (R-PII-4 — enforced by type)
// ===========================================================================

/**
 * Texto que ya pasó por anonymizePII() y NO contiene cleartext PII.
 * Branded para forzar que LoggerService.logTurn() solo acepta este tipo.
 * Cualquier intento de pasar un string crudo será error de compilación.
 */
export type RedactedText = Branded<string, 'RedactedText'>;

/**
 * NO USAR esta función fuera de pii-anonymizer.ts. Existe solo para que el
 * módulo anonymizer pueda producir RedactedText sin un cast `as RedactedText`
 * suelto en el codebase. La regla es: solo el anonymizer produce este tipo.
 */
export function asRedactedText(value: string): RedactedText {
  return value as RedactedText;
}

// ===========================================================================
// Policy version
// ===========================================================================

export type PolicyVersion = Branded<string, 'PolicyVersion'>;

export const PolicyVersionSchema = z
  .string()
  .min(1)
  .transform((v) => v as PolicyVersion);

// ===========================================================================
// Common primitives
// ===========================================================================

export const Iso8601Schema = z.string().datetime();
export type Iso8601 = string;

export const NonNegativeIntSchema = z.number().int().nonnegative();
export const PositiveIntSchema = z.number().int().positive();
