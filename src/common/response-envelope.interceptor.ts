import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {getRequestContext} from './http.util';
import {AppRequest} from './types';

export interface ResponseMeta {
  requestId: string;
  correlationId: string;
  timestamp: string; // ISO
  durationMs?: number;
  path?: string;
  method?: string;
  stage?: string;
  version?: string;
}

export interface ResponseEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta: ResponseMeta;
}


@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
      const req = http.getRequest<AppRequest>();
      const res = http.getResponse();
    return next.handle().pipe(
      map((data) => {
        const now = Date.now();
          const {apiGwEvent, requestId, correlationId, stage} = getRequestContext(req);
        const meta: ResponseMeta = {
          requestId,
          correlationId,
          timestamp: new Date(now).toISOString(),
          durationMs: now - startedAt,
          path: req.path,
          method: req.method,
            stage,
          version: process.env.APP_VERSION,
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Request-Id', meta.requestId);
        res.setHeader('X-Correlation-Id', meta.correlationId);
        const envelope: ResponseEnvelope<any> = { success: true, data, meta };
        return envelope;
      })
    );
  }
}
