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

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const res = await supertest(app.server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  it('returns 503 when DB is unavailable', async () => {
    const res = await supertest(app.server).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
  });
});
