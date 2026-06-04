import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

export interface PostgresPluginOptions {
  connectionString: string;
  poolSize?: number;
}

export default fp<PostgresPluginOptions>(async (fastify: FastifyInstance, opts) => {
  const pool = new Pool({
    connectionString: opts.connectionString,
    max: opts.poolSize ?? 10,
  });

  fastify.decorate('pg', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
}, {
  name: 'postgres',
});
