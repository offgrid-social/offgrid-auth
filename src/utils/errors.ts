import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errorHandler = (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
  const isZodError = error instanceof ZodError;
  const statusCode = isZodError ? 400 : (error as AppError).statusCode || error.statusCode || 500;
  const code = isZodError ? 'VALIDATION_ERROR' : (error as AppError).code || 'INTERNAL_SERVER_ERROR';
  const details = isZodError ? error.errors : (error as AppError).details || (error as any).validation;

  const responseBody = {
    error: {
      code,
      message:
        statusCode >= 500 && request.server.log.level !== 'debug' && process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message,
      details,
      requestId: request.id,
    },
  };

  if (statusCode >= 500) {
    request.log.error({ err: error }, 'Unhandled error');
  }

  return reply.status(statusCode).send(responseBody);
};
