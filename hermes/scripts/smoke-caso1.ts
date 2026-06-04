import { buildApp } from '../src/app.js';

async function main(): Promise<void> {
  // Defaults defensivos: solo aplican si la env var no está seteada (e.g. via .env).
  // Esto permite que el script funcione con docker-compose creds reales.
  process.env.SFCC_MODE ??= 'mock';
  process.env.PII_SALT ??= 'a'.repeat(32);
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/hermes';
  process.env.POSTGRES_ROOT_PASSWORD ??= 'dev';
  process.env.PG_APP_PASSWORD ??= 'dev';
  process.env.PG_RETENTION_PASSWORD ??= 'dev';
  process.env.AWS_ACCESS_KEY_ID ??= 'PLACEHOLDER';
  process.env.AWS_SECRET_ACCESS_KEY ??= 'PLACEHOLDER';

  const app = await buildApp();
  await app.ready();

  const res1 = await app.inject({ method: 'GET', url: '/health' });
  console.log('GET /health →', res1.statusCode, res1.body);

  const res2 = await app.inject({
    method: 'GET',
    url: '/widget/config?brand=patprimo',
  });
  console.log('GET /widget/config →', res2.statusCode, JSON.stringify(res2.body));

  const res3 = await app.inject({
    method: 'POST',
    url: '/chat',
    payload: {
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      brand: 'patprimo',
      message: '¿Cuál es el estado de mi pedido PP-2026-0001?',
    },
  });
  console.log('POST /chat →', res3.statusCode, JSON.stringify(res3.body));

  await app.close();
}

void main();
