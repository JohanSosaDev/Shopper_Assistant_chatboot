import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface SecurityPluginOptions {
  allowedOrigins: string[];
  rateLimitMax: number;
  rateLimitTimeWindow: string;
}

export default fp<SecurityPluginOptions>(async (fastify: FastifyInstance, opts) => {
  await fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    // Permite que el widget.js/.css y /chat sean cargados desde otros origenes
    // (e.g. sandbox SFCC `*.demandware.net` cargando el bundle del tunnel).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await fastify.register(import('@fastify/cors'), {
    origin: opts.allowedOrigins,
    credentials: true,
  });

  await fastify.register(import('@fastify/rate-limit'), {
    max: opts.rateLimitMax,
    timeWindow: opts.rateLimitTimeWindow,
    keyGenerator: (req) => req.ip,
  });
}, {
  name: 'security',
});
