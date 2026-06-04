-- postgres-init.sql
-- Runs ONCE when the postgres container initializes (mounted into /docker-entrypoint-initdb.d/).
-- NOT a migration: this is the bootstrap for extensions and roles.
-- Migrations (0001..N) run AFTER this, via `npm run migrate` (postgres-migrations).

-- ===========================================================================
-- Extensions (required by application)
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() for primary keys
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector for M2 Knowledge stub (Unit 2 RAG Fase 2)

-- ===========================================================================
-- Roles (NFR §4.2 SECURITY-06 — separation of duties)
-- ===========================================================================
-- Passwords are sourced from env vars set by docker-compose. NEVER hardcode here.
--   PG_APP_PASSWORD       runtime app role (INSERT-mostly, SELECT-mostly)
--   PG_RETENTION_PASSWORD retention/forget jobs (DELETE-allowed on append-only)

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hermes_app') THEN
    CREATE ROLE hermes_app WITH LOGIN PASSWORD :'app_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hermes_retention') THEN
    CREATE ROLE hermes_retention WITH LOGIN PASSWORD :'retention_password';
  END IF;
END $$;

-- Grant connect on the hermes database (created by Postgres env vars in docker-compose)
GRANT CONNECT ON DATABASE hermes TO hermes_app;
GRANT CONNECT ON DATABASE hermes TO hermes_retention;

-- Default schema permissions (specific table grants happen in each migration)
GRANT USAGE ON SCHEMA public TO hermes_app;
GRANT USAGE ON SCHEMA public TO hermes_retention;

-- ===========================================================================
-- Note on append-only enforcement
-- ===========================================================================
-- The append-only invariant on consent_log, turn_log_audit, pii_token_map is
-- enforced by REVOKE UPDATE, DELETE from hermes_app at the END of each
-- migration that creates such a table. The hermes_retention role retains
-- DELETE for retention jobs (SECURITY-14).
