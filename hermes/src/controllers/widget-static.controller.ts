import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { FastifyInstance } from 'fastify';

export async function registerWidgetStaticRoutes(fastify: FastifyInstance): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const publicDir = join(__dirname, '..', '..', 'widget', 'public');

  await fastify.register(import('@fastify/static'), {
    root: publicDir,
    prefix: '/widget/',
  });
}
