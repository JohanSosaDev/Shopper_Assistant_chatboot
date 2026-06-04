-- 0002-consent-log.sql
-- Append-only log of every consent decision per conversation.
-- Domain-entities.md §4 + R-CONS-5 + SECURITY-13.

CREATE TABLE consent_log (
  consent_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  granted           BOOLEAN NOT NULL,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  policy_version    TEXT NOT NULL,
  client_text       TEXT NOT NULL
);

-- App role: INSERT only (append-only enforcement per R-CONS-5)
GRANT SELECT, INSERT ON consent_log TO hermes_app;

-- Explicitly REVOKE UPDATE and DELETE — append-only contract
REVOKE UPDATE, DELETE ON consent_log FROM hermes_app;

-- Retention role: DELETE allowed for purge jobs (SECURITY-14, R-PII-3)
GRANT SELECT, DELETE ON consent_log TO hermes_retention;

-- Index: query by conversation, ordered by most recent (R-CONS effective = last record)
CREATE INDEX idx_consent_log_conversation_timestamp
  ON consent_log (conversation_id, timestamp DESC);
