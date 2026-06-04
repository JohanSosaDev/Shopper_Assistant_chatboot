#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hermes_root') THEN
    CREATE ROLE hermes_root WITH LOGIN SUPERUSER PASSWORD '$POSTGRES_ROOT_PASSWORD';
  END IF;
END
\$\$;
EOSQL
