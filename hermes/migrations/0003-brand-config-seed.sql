-- 0003-brand-config-seed.sql
-- Brand config seed table (Unit 1 read-only; Unit 2 will introduce
-- brand_config_versions with full CRUD + versioning + sign-off).
-- Domain-entities.md §5.
--
-- The full system_prompt and few_shot_examples for Patprimo are populated by
-- Step 9 (Prompts) via `npm run seed`, NOT in this migration. This migration
-- creates the schema only.

CREATE TABLE brand_configs (
  brand                  TEXT PRIMARY KEY,
  version_id             TEXT NOT NULL DEFAULT 'seed-1',
  system_prompt          TEXT NOT NULL,
  few_shot_examples      JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_facing_name   TEXT NOT NULL,
  tone                   TEXT NOT NULL,
  language               TEXT NOT NULL DEFAULT 'es-CO',
  consent_request_text   TEXT NOT NULL,
  consent_denied_text    TEXT NOT NULL,
  neutral_fallback_text  TEXT NOT NULL,
  policy_version         TEXT NOT NULL,

  CONSTRAINT brand_config_examples_is_array CHECK (jsonb_typeof(few_shot_examples) = 'array'),
  CONSTRAINT brand_config_tone_valid CHECK (tone IN ('formal_close', 'casual', 'formal'))
);

-- App role: read-only in Unit 1. Unit 2 will broaden via brand_config_versions
-- table (this table will be deprecated then).
GRANT SELECT ON brand_configs TO hermes_app;

-- Bootstrap Patprimo with placeholder content. Step 9 will UPDATE these
-- with the final hardened system prompt and few-shot examples via seed script.
INSERT INTO brand_configs (
  brand,
  version_id,
  system_prompt,
  customer_facing_name,
  tone,
  language,
  consent_request_text,
  consent_denied_text,
  neutral_fallback_text,
  policy_version
) VALUES (
  'patprimo',
  'seed-1',
  -- Placeholder system prompt — Step 9 replaces this with the full hardened version
  'PLACEHOLDER: replaced by npm run seed (Step 9)',
  'Sofía de Patprimo',
  'formal_close',
  'es-CO',
  'Soy Sofía, asistente virtual de Patprimo. ¿Me autoriza procesar sus datos para esta consulta?',
  'Entendido. Sin su autorización no puedo continuar. Puede contactarnos por correo en horario hábil.',
  'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?',
  'patprimo-policy-v1'
);
