-- 0001-init.sql
-- Core tables for Unit 1: conversations, turns, tool_call_records,
-- guardrail_events, rate_limit_buckets.
-- Forward-only (per OD-2). If something is wrong, fix in a new migration.

-- ===========================================================================
-- ENUMs
-- ===========================================================================

CREATE TYPE auth_method_enum AS ENUM (
  'sfcc_session',
  'guest_matched',
  'guest_unauth'
);

CREATE TYPE conversation_status_enum AS ENUM (
  'awaiting_consent',
  'active',
  'closed',
  'consent_denied'
);

CREATE TYPE close_reason_enum AS ENUM (
  'ttl_inactivity',
  'consent_denied',
  'client_explicit_close'
);

CREATE TYPE turn_role_enum AS ENUM (
  'user',
  'assistant',
  'system'
);

CREATE TYPE early_exit_reason_enum AS ENUM (
  'consent_request',
  'consent_denied',
  'input_guardrail_block',
  'output_guardrail_block',
  'tool_unavailable',
  'rate_limit'
);

CREATE TYPE guardrail_layer_enum AS ENUM (
  'input',
  'output'
);

CREATE TYPE guardrail_severity_enum AS ENUM (
  'low',
  'medium',
  'high'
);

-- ===========================================================================
-- conversations
-- ===========================================================================
-- One row per chat session. State machine: awaiting_consent -> active -> closed
-- or awaiting_consent -> consent_denied.

CREATE TABLE conversations (
  conversation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand             TEXT NOT NULL,
  customer_id_hash  TEXT,
  auth_method       auth_method_enum NOT NULL,
  status            conversation_status_enum NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  close_reason      close_reason_enum,
  policy_version    TEXT NOT NULL,

  -- Invariants from domain-entities.md §2
  CONSTRAINT conv_closed_requires_metadata CHECK (
    (status = 'closed' AND closed_at IS NOT NULL AND close_reason IS NOT NULL)
    OR status <> 'closed'
  ),
  CONSTRAINT conv_activity_monotonic CHECK (last_activity_at >= started_at),
  CONSTRAINT conv_closed_at_after_start CHECK (closed_at IS NULL OR closed_at >= started_at)
);

GRANT SELECT, INSERT, UPDATE ON conversations TO hermes_app;
-- Note: UPDATE allowed because conversation status transitions over its lifecycle.
-- DELETE NOT granted (per SECURITY-13 — historical conversations are not deleted by app).

-- ===========================================================================
-- turns
-- ===========================================================================
-- One row per message in a conversation. Both user and assistant turns are stored.

CREATE TABLE turns (
  turn_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  role               turn_role_enum NOT NULL,
  text               TEXT NOT NULL,
  intent             TEXT,
  confidence         NUMERIC(4, 3),
  timestamp          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms         INTEGER,
  tokens_in          INTEGER,
  tokens_out         INTEGER,
  model_id           TEXT,
  early_exit_reason  early_exit_reason_enum,

  -- Invariants from domain-entities.md §3
  CONSTRAINT turn_text_length CHECK (char_length(text) <= 4000),
  CONSTRAINT turn_user_no_assistant_fields CHECK (
    role <> 'user' OR (
      latency_ms IS NULL
      AND tokens_in IS NULL
      AND tokens_out IS NULL
      AND model_id IS NULL
    )
  ),
  CONSTRAINT turn_early_exit_only_assistant CHECK (
    early_exit_reason IS NULL OR role = 'assistant'
  ),
  CONSTRAINT turn_confidence_range CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  )
);

GRANT SELECT, INSERT ON turns TO hermes_app;
-- Turns are append-only by convention; no UPDATE granted.

-- ===========================================================================
-- tool_call_records
-- ===========================================================================
-- Detail per tool invocation within a turn (M3 SFCC integrations).

CREATE TABLE tool_call_records (
  tool_call_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id        UUID NOT NULL REFERENCES turns(turn_id) ON DELETE CASCADE,
  tool_name      TEXT NOT NULL,
  input_hash     TEXT NOT NULL,
  success        BOOLEAN NOT NULL,
  latency_ms     INTEGER NOT NULL,
  error_class    TEXT,
  retries_used   INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT tcr_retries_range CHECK (retries_used >= 0 AND retries_used <= 3),
  CONSTRAINT tcr_latency_positive CHECK (latency_ms >= 0)
);

GRANT SELECT, INSERT ON tool_call_records TO hermes_app;

-- ===========================================================================
-- guardrail_events
-- ===========================================================================
-- Log of any guardrail trigger (input or output). Pattern_matched stores the
-- regex/pattern NAME or short identifier, NEVER the customer content.

CREATE TABLE guardrail_events (
  event_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id          UUID NOT NULL REFERENCES turns(turn_id) ON DELETE CASCADE,
  layer            guardrail_layer_enum NOT NULL,
  category         TEXT NOT NULL,
  pattern_matched  TEXT NOT NULL,
  severity         guardrail_severity_enum NOT NULL,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT ON guardrail_events TO hermes_app;

-- ===========================================================================
-- rate_limit_buckets
-- ===========================================================================
-- Storage for @fastify/rate-limit using Postgres backend (TD-9: avoid Redis in MVP).
-- Per R-RATE-4 fail-closed: if this table is unreachable, the rate limiter
-- should reject requests rather than allow unbounded traffic.

CREATE TABLE rate_limit_buckets (
  bucket_key   TEXT PRIMARY KEY,
  current      INTEGER NOT NULL DEFAULT 0,
  ttl_ms       INTEGER NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_buckets TO hermes_app;
-- Rate limit buckets are short-lived; DELETE granted to app for expiry cleanup.

-- Index for expiry cleanup job
CREATE INDEX idx_rate_limit_expires_at ON rate_limit_buckets (expires_at);
