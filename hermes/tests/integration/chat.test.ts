import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';

vi.mock('@anthropic-ai/bedrock-sdk', () => ({
  AnthropicBedrock: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn().mockResolvedValue({ content: [{ text: 'mock' }] }) },
  })),
}));

import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/nonexistent';
  process.env.POSTGRES_ROOT_PASSWORD = 'root';
  process.env.PG_APP_PASSWORD = 'app';
  process.env.PG_RETENTION_PASSWORD = 'retention';
  process.env.BEDROCK_REGION = 'us-east-1';
  process.env.BEDROCK_MODEL_ID = 'claude-haiku-4.5';
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
  process.env.ALLOWED_ORIGINS = '*';
  process.env.RATE_LIMIT_IP_MAX = '100';
  process.env.SFCC_MODE = 'mock';
  process.env.SFCC_BASE_URL = 'http://localhost:3000';
  process.env.SFCC_CLIENT_ID = 'test';
  process.env.SFCC_CLIENT_SECRET = 'test';
  process.env.PII_SALT = 'a'.repeat(32);

  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('POST /chat', () => {
  it('returns 400 for missing body fields', async () => {
    const res = await supertest(app.server).post('/chat').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid brand', async () => {
    const res = await supertest(app.server)
      .post('/chat')
      .send({
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'unknown',
        message: 'hola',
      });
    expect(res.status).toBe(400);
  });

  it('returns turn_id and text on success', async () => {
    const res = await supertest(app.server)
      .post('/chat')
      .send({
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'patprimo',
        message: 'hola',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('turn_id');
    expect(res.body).toHaveProperty('conversation_id');
    expect(res.body).toHaveProperty('text');
    expect(typeof res.body.text).toBe('string');
  });
});

describe('GET /widget/config', () => {
  it('returns widget config for valid brand', async () => {
    const res = await supertest(app.server).get('/widget/config?brand=patprimo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('brand', 'patprimo');
    expect(res.body).toHaveProperty('customerFacingName');
    expect(res.body).toHaveProperty('consentRequestText');
  });

  it('returns 400 for invalid brand', async () => {
    const res = await supertest(app.server).get('/widget/config?brand=invalid');
    expect(res.status).toBe(400);
  });
});
