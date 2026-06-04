// brand-config.ts
// BrandConfig schema. Matches migrations/0003-brand-config-seed.sql.
// domain-entities.md §5.
// En Unit 1 esto es solo seed read-only. Unit 2 introduce brand_config_versions
// con versioning + sign-off + activate/rollback (interfaz se mantiene).

import { z } from 'zod';
import { BrandIdSchema, PolicyVersionSchema } from './shared.js';

// ===========================================================================
// Few-shot example
// ===========================================================================

export const FewShotExampleSchema = z.object({
  user_message: z.string().min(1).max(1000),
  assistant_response: z.string().min(1).max(2000),
});

export type FewShotExample = z.infer<typeof FewShotExampleSchema>;

// ===========================================================================
// Tone enum (matches CHECK constraint en SQL)
// ===========================================================================

export const ToneEnumSchema = z.enum(['formal_close', 'casual', 'formal']);
export type Tone = z.infer<typeof ToneEnumSchema>;

// ===========================================================================
// Brand config
// ===========================================================================

export const BrandConfigSchema = z.object({
  brand: BrandIdSchema,
  /** En Unit 1 siempre 'seed-1'. Unit 2 introduce semantic versioning. */
  version_id: z.string().min(1),
  system_prompt: z.string().min(100).max(10000),
  few_shot_examples: z.array(FewShotExampleSchema).min(0).max(30),
  /**
   * Nombre customer-facing del asistente para esta marca.
   * Patprimo: "Sofía de Patprimo".
   * Las otras marcas tienen placeholder "Por definir..." hasta Fase 2; el
   * RolloutGate las fuerza a traffic 0 mientras tanto (per PRODUCT.md §Multi-marca).
   */
  customer_facing_name: z.string().min(3).max(50),
  tone: ToneEnumSchema,
  language: z.string().default('es-CO'),
  consent_request_text: z.string().min(50).max(1000),
  consent_denied_text: z.string().min(50).max(500),
  neutral_fallback_text: z.string().min(20).max(500),
  policy_version: PolicyVersionSchema,
});

export type BrandConfig = z.infer<typeof BrandConfigSchema>;

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Detecta si el CFN sigue siendo placeholder (marcas no listas para Fase 2).
 * Usado por RolloutGate para forzar traffic_percentage=0 en esas marcas.
 */
export function isCustomerFacingNamePlaceholder(cfn: string): boolean {
  return /^Por definir/i.test(cfn);
}
