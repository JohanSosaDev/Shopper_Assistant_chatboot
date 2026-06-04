-- 0005-indexes.sql
-- Performance indexes for common query patterns.
-- Created in a separate migration so they can be added/removed independently
-- without touching table definitions.

-- ===========================================================================
-- conversations
-- ===========================================================================

-- Query: find conversations by customer (Unit 3 drill-down)
CREATE INDEX idx_conversations_customer_id_hash
  ON conversations (customer_id_hash)
  WHERE customer_id_hash IS NOT NULL;

-- Query: session-cleanup job — find stale active conversations
CREATE INDEX idx_conversations_active_stale
  ON conversations (last_activity_at)
  WHERE status = 'active';

-- Query: dashboard recent conversations by brand
CREATE INDEX idx_conversations_brand_started
  ON conversations (brand, started_at DESC);

-- ===========================================================================
-- turns
-- ===========================================================================

-- Query: load conversation history (R-SESS-3 multi-turn context)
CREATE INDEX idx_turns_conversation_timestamp
  ON turns (conversation_id, timestamp);

-- ===========================================================================
-- tool_call_records
-- ===========================================================================

-- Query: per-turn tool calls
CREATE INDEX idx_tool_call_records_turn
  ON tool_call_records (turn_id);

-- Query: tool error monitoring (Unit 3 alerting)
CREATE INDEX idx_tool_call_records_errors
  ON tool_call_records (tool_name, error_class)
  WHERE success = false;

-- ===========================================================================
-- guardrail_events
-- ===========================================================================

-- Query: per-turn guardrail events
CREATE INDEX idx_guardrail_events_turn ON guardrail_events (turn_id);

-- Query: severity-based alerting feed (Unit 3 R-ALERT-2 guardrail_violation rule)
CREATE INDEX idx_guardrail_events_severity_timestamp
  ON guardrail_events (severity, timestamp DESC)
  WHERE severity IN ('medium', 'high');

-- ===========================================================================
-- turn_log_audit
-- ===========================================================================

-- Query: dashboard recent activity by brand
CREATE INDEX idx_turn_log_audit_brand_timestamp
  ON turn_log_audit (brand, timestamp_iso DESC);

-- Query: drill-down by conversation (Unit 3 R-DASH-5)
CREATE INDEX idx_turn_log_audit_conversation
  ON turn_log_audit (conversation_id, timestamp_iso);

-- Query: customer recurrent view (Unit 3 R-DASH-4)
CREATE INDEX idx_turn_log_audit_customer
  ON turn_log_audit (customer_id_hash, timestamp_iso DESC)
  WHERE customer_id_hash IS NOT NULL;

-- Query: retention job — find logs older than 90 days
-- NOTE: cannot use WHERE timestamp_iso < (NOW() - INTERVAL '90 days') as
-- predicate because NOW() is STABLE not IMMUTABLE. Full index on the column;
-- planner uses it for the retention scan with parameter-based predicate.
CREATE INDEX idx_turn_log_audit_retention
  ON turn_log_audit (timestamp_iso);

-- Query: latency monitoring (Unit 3 R-ALERT-2 latency_p95_breach)
CREATE INDEX idx_turn_log_audit_latency_recent
  ON turn_log_audit (timestamp_iso DESC, latency_ms)
  WHERE latency_ms IS NOT NULL;
