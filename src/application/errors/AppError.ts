export interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, opts: { httpStatus: number; code: string; details?: unknown }) {
    super(message);
    this.httpStatus = opts.httpStatus;
    this.code = opts.code;
    this.details = opts.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toBody(): ErrorBody {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 400, code: 'BAD_REQUEST', details });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 404, code: 'NOT_FOUND', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 401, code: 'UNAUTHORIZED', details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 403, code: 'FORBIDDEN', details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { httpStatus: 409, code: 'CONFLICT', details });
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, { httpStatus: 500, code: 'INTERNAL_ERROR', details });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details?: unknown) {
    super(message, {httpStatus: 503, code: 'SERVICE_UNAVAILABLE', details});
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  // Map Express body-parser JSON syntax errors to ValidationError (400)
  const anyErr = err as any;
  if (anyErr && anyErr instanceof SyntaxError && ((anyErr as any).status === 400 || (anyErr as any).type === 'entity.parse.failed')) {
    return new ValidationError('Invalid JSON payload', {
      type: (anyErr as any).type,
      originalMessage: anyErr.message,
    });
  }

  // Map Nest BadRequestException (e.g., body-parser or validation) to ValidationError
  if (anyErr && anyErr.name === 'BadRequestException') {
    return new ValidationError(anyErr.message || 'Bad request');
  }

  if (err instanceof Error) {
    const isDev = (process.env.NODE_ENV || process.env.STAGE) === 'dev';
    return new InternalError(isDev ? err.message : undefined);
  }
  return new InternalError();
}
