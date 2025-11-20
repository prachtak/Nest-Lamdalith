import {ArgumentsHost, Catch, ExceptionFilter, HttpStatus} from '@nestjs/common';
import {AppError, toAppError} from '../application/errors/AppError';
import {getRequestContext} from './http.util';
import {AppRequest} from './types';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AppRequest>();
    const res = ctx.getResponse();

    const now = Date.now();
    const {requestId, correlationId, stage} = getRequestContext(req);

    const appErr: AppError = toAppError(exception);
    const body = {
      success: false,
      error: appErr.toBody(),
      meta: {
        requestId,
        correlationId,
        timestamp: new Date(now).toISOString(),
        durationMs: req?.startedAt ? now - req.startedAt : undefined,
        path: req.path,
        method: req.method,
        stage,
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
