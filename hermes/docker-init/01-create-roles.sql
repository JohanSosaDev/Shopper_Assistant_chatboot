DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hermes_retention') THEN
    CREATE ROLE hermes_retention WITH LOGIN;
  END IF;
END
$$;
