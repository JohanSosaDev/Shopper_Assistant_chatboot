import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT } from './prompts/patprimo/system.prompt.js';
import { PATPRIMO_TEXTS } from './prompts/patprimo/texts.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    await pool.query(
      `UPDATE brand_configs
       SET system_prompt = $1,
           consent_request_text = $2,
           consent_denied_text = $3,
           neutral_fallback_text = $4
       WHERE brand = 'patprimo'`,
      [
        SYSTEM_PROMPT,
        PATPRIMO_TEXTS.consentRequestText,
        PATPRIMO_TEXTS.consentDeniedText,
        PATPRIMO_TEXTS.neutralFallbackText,
      ],
    );

    console.log('Patprimo brand config seeded successfully');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fixturesPath = join(__dirname, '..', 'fixtures', 'demo-orders.json');

    try {
      const demoOrders = JSON.parse(readFileSync(fixturesPath, 'utf-8'));
      console.log(`Demo orders loaded: ${demoOrders.length} orders`);
    } catch {
      console.warn('No demo orders fixture found at', fixturesPath);
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
