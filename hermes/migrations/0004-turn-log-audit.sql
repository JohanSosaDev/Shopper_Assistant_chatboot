-- 0004-turn-log-audit.sql
-- Append-only audit copy of each turn with PII anonymized.
-- Domain-entities.md §10 + R-PII-4 + SECURITY-03 + SECURITY-13 + SECURITY-14.
-- Also creates pii_token_map for reversible token mapping (NO raw PII stored).

-- ===========================================================================
-- pii_token_map
-- ===========================================================================
-- Maps anonymized tokens like <EMAIL_1> to a hash of the original PII value.
-- Append-only; NEVER stores raw PII.
-- Domain-entities.md §9.

CREATE TYPE pii_value_type_enum AS ENUM (
  'email',
  'phone',
  'order_id',
  'card',
  'cedula'
);

CREATE TABLE pii_token_map (
  map_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id     UUID NOT NULL REFERENCES turns(turn_id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  value_hash  TEXT NOT NULL,
  value_type  pii_value_type_enum NOT NULL
);

-- App role: INSERT only (write-only in Unit 1, no read needed)
GRANT INSERT ON pii_token_map TO hermes_app;
REVOKE UPDATE, DELETE ON pii_token_map FROM hermes_app;

-- Retention role: DELETE allowed for purge jobs
GRANT SELECT, DELETE ON pii_token_map TO hermes_retention;

CREATE INDEX idx_pii_token_map_turn ON pii_token_map (turn_id);

-- ===========================================================================
-- turn_log_audit
-- ===========================================================================
-- Auditable copy of each turn with PII anonymized.
-- Retention: ≥90 days (SECURITY-14).
-- Append-only enforced via REVOKE.

CREATE TABLE turn_log_audit (
  log_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id                UUID NOT NULL REFERENCES turns(turn_id) ON DELETE CASCADE,
  conversation_id        UUID NOT NULL,
  timestamp_iso          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id_hash       TEXT,
  brand                  TEXT NOT NULL,
  intent_classified      TEXT,
  tools_called           TEXT[] NOT NULL DEFAULT '{}',
  latency_ms             INTEGER,
  tokens_in              INTEGER,
  tokens_out             INTEGER,
  model_id               TEXT,
  output_text_redacted   TEXT NOT NULL,
  sentiment_score        NUMERIC(4, 3),
  guardrail_violations   TEXT[] NOT NULL DEFAULT '{}',
  early_exit_reason      TEXT,

  CONSTRAINT tla_sentiment_range CHECK (
    sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1)
  ),
  CONSTRAINT tla_latency_positive CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

-- App role: INSERT only (append-only) + SELECT for dashboard read in Unit 3
GRANT SELECT, INSERT ON turn_log_audit TO hermes_app;
REVOKE UPDATE, DELETE ON turn_log_audit FROM hermes_app;

-- Retention role: DELETE allowed for 90-day purge job
GRANT SELECT, DELETE ON turn_log_audit TO hermes_retention;
