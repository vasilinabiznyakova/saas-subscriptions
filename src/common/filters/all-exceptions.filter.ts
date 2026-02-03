import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
};

function statusText(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    default:
      return 'Error';
  }
}

function prismaToHttp(e: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
} {
  switch (e.code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: 'Unique constraint violation',
      };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
    case 'P2003':
      return {
        status: HttpStatus.CONFLICT,
        message: 'Foreign key constraint violation',
      };
    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
      };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    const timestamp = new Date().toISOString();
    const path = req.originalUrl || req.url;

    // Guarantee requestId and always expose it in error responses
    const requestId =
      req.requestId ??
      (res.getHeader('X-Request-Id') as string | undefined) ??
      randomUUID();

    // Ensure header is always present even on errors (incl. validation errors)
    res.setHeader('X-Request-Id', requestId);

    // 1) Nest HttpException (validation, Unauthorized, NotFound etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let message: string | string[];

      if (typeof response === 'string') {
        message = response;
      } else if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        message =
          (response as { message?: string | string[] }).message ??
          exception.message;
      } else {
        message = exception.message;
      }

      const body: ErrorBody = {
        statusCode: status,
        error: statusText(status),
        message,
        path,
        timestamp,
        requestId,
      };

      return res.status(status).json(body);
    }

    // 2) Prisma known errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaToHttp(exception);

      const body: ErrorBody = {
        statusCode: mapped.status,
        error: statusText(mapped.status),
        message: mapped.message,
        path,
        timestamp,
        requestId,
      };

      return res.status(mapped.status).json(body);
    }

    // 3) Rest — 500
    const body: ErrorBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: statusText(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
      path,
      timestamp,
      requestId,
    };

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
