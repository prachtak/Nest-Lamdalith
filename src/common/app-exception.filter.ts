import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { AppError, toAppError } from '../application/errors/AppError';

function getHeader(headers: Record<string, any>, name: string): string | undefined {
  const found = Object.entries(headers || {}).find(([k]) => k.toLowerCase() === name.toLowerCase());
  return (found?.[1] as string) || undefined;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const now = Date.now();
    const apiGwEvent = req?.apiGateway?.event ?? req?.requestContext ?? undefined;
    const requestId = apiGwEvent?.requestContext?.requestId || req.headers?.['x-amzn-requestid'] || 'unknown';
    const corr = getHeader(req.headers || {}, 'x-correlation-id');
    const correlationId = corr || requestId;

    const appErr: AppError = toAppError(exception);
    const body = {
      success: false,
      error: appErr.toBody(),
      meta: {
        requestId,
        correlationId,
        timestamp: new Date(now).toISOString(),
        path: req.path,
        method: req.method,
        stage: apiGwEvent?.requestContext?.stage,
        version: process.env.APP_VERSION,
      },
    };

    const status = appErr.httpStatus || HttpStatus.INTERNAL_SERVER_ERROR;
    res.status(status);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', body.meta.requestId);
    res.setHeader('X-Correlation-Id', body.meta.correlationId);
    res.json(body);
  }
}
