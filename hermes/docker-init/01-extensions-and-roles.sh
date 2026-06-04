#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hermes_retention') THEN
    CREATE ROLE hermes_retention WITH LOGIN PASSWORD '$PG_RETENTION_PASSWORD';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE $POSTGRES_DB TO hermes_retention;
GRANT USAGE ON SCHEMA public TO hermes_retention;
EOSQL
