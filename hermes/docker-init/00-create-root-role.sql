-- Create root superuser role for migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hermes_root') THEN
    CREATE ROLE hermes_root WITH LOGIN SUPERUSER PASSWORD :'POSTGRES_ROOT_PASSWORD';
  END IF;
END
$$;
