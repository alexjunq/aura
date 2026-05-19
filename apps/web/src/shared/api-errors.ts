import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@aura/logger';

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'illegal_transition'
  | 'internal_error';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): NextResponse<ApiErrorBody> {
    return NextResponse.json<ApiErrorBody>(
      { error: { code: this.code, message: this.message, fields: this.fields } },
      { status: this.status },
    );
  }
}

/**
 * UnauthorizedError is thrown by `getAuthContext()` when the request lacks a
 * usable session. It lives here (not in `auth-context.ts`) so that domain
 * modules can catch it without dragging next-auth into their import graph —
 * service-layer integration tests rely on that.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super('unauthenticated');
    this.name = 'UnauthorizedError';
  }
}

export const errors = {
  unauthenticated: () => new ApiError('unauthenticated', 'Sign in required', 401),
  forbidden: (msg = 'Forbidden') => new ApiError('forbidden', msg, 403),
  notFound: (msg = 'Not found') => new ApiError('not_found', msg, 404),
  validation: (msg: string, fields?: Record<string, string[]>) =>
    new ApiError('validation_failed', msg, 400, fields),
  conflict: (msg: string) => new ApiError('conflict', msg, 409),
  illegalTransition: (msg: string) => new ApiError('illegal_transition', msg, 409),
  internal: (msg = 'Internal error') => new ApiError('internal_error', msg, 500),
};

/**
 * Single chokepoint for translating thrown errors to API responses.
 */
export function toApiErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) return err.toResponse();
  if (err instanceof UnauthorizedError) return errors.unauthenticated().toResponse();
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (fields[key] ??= []).push(issue.message);
    }
    return errors.validation('Invalid request body', fields).toResponse();
  }
  logger.error({ err }, 'unhandled error');
  return errors.internal().toResponse();
}
