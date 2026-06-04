import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().url(),
  POSTGRES_ROOT_PASSWORD: z.string().min(1),
  PG_APP_PASSWORD: z.string().min(1),
  PG_RETENTION_PASSWORD: z.string().min(1),

  BEDROCK_REGION: z.string().min(1).default('sa-east-1'),
  BEDROCK_MODEL_ID: z.string().min(1).default('anthropic.claude-haiku-4-5:0'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),

  SFCC_MODE: z.enum(['real', 'mock']).default('real'),
  SFCC_BASE_URL: z.string().optional(),
  SFCC_CLIENT_ID: z.string().optional(),
  SFCC_CLIENT_SECRET: z.string().optional(),

  PII_SALT: z.string().min(32, 'PII_SALT debe tener al menos 32 caracteres'),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_IP_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_CONV_MAX: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().optional(),

  SLACK_WEBHOOK_URL: z.string().optional(),

  SMTP_HOST: z.string().default('mailhog'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().default('hermes@patprimo.local'),
}).refine(
  (data) => {
    if (data.SFCC_MODE === 'real') {
      return !!(data.SFCC_BASE_URL && data.SFCC_CLIENT_ID && data.SFCC_CLIENT_SECRET);
    }
    return true;
  },
  {
    message: 'SFCC_BASE_URL, SFCC_CLIENT_ID, y SFCC_CLIENT_SECRET son requeridos cuando SFCC_MODE=real',
    path: ['SFCC_MODE'],
  },
);

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error('Environment validation failed:\n' + issues);
    process.exit(1);
  }

  return result.data;
}
