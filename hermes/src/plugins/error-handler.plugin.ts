import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { HermesError, isHermesError } from '../models/errors.js';

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((
    error: FastifyError | HermesError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    request.log.error({ err: error }, 'request failed');

    if (isHermesError(error)) {
      reply.status(error.httpStatus).send({
        status: 'error',
        code: error.code,
        message: error.userFacingMessage,
      });
      return;
    }

    if ('statusCode' in error && typeof error.statusCode === 'number') {
      reply.status(error.statusCode).send({
        status: 'error',
        code: 'HTTP_ERROR',
        message: error.message ?? 'Error en la solicitud',
      });
      return;
    }

    reply.status(500).send({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Estamos teniendo un problema técnico. Intente en unos minutos.',
    });
  });
}, {
  name: 'error-handler',
});
