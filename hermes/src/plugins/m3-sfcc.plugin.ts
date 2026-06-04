import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { ToolRegistry } from '../tools/tool-registry.js';

declare module 'fastify' {
  interface FastifyInstance {
    toolRegistry: ToolRegistry;
  }
}

export default fp<{ toolRegistry: ToolRegistry }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('toolRegistry', opts.toolRegistry);
  },
  { name: 'm3-sfcc' },
);
