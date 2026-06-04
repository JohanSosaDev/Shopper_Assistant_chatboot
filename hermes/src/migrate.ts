import { migrate } from 'postgres-migrations';
import { Pool } from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsDir = join(__dirname, '..', 'migrations');

    await migrate({ client: pool }, migrationsDir);
    console.log('Migrations applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
