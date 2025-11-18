import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

function getHeader(headers: Record<string, any>, name: string): string | undefined {
  const found = Object.entries(headers || {}).find(([k]) => k.toLowerCase() === name.toLowerCase());
  return (found?.[1] as string) || undefined;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    return next.handle().pipe(
      map((data) => {
        const now = Date.now();
        // Extract API Gateway event if available via serverless-express
        const apiGwEvent = req?.apiGateway?.event ?? req?.requestContext ?? undefined;
        const requestId = apiGwEvent?.requestContext?.requestId || req.headers?.['x-amzn-requestid'] || 'unknown';
        const corr = getHeader(req.headers || {}, 'x-correlation-id');
        const correlationId = corr || requestId;
        const meta: ResponseMeta = {
          requestId,
          correlationId,
          timestamp: new Date(now).toISOString(),
          durationMs: now - startedAt,
          path: req.path,
          method: req.method,
          stage: apiGwEvent?.requestContext?.stage,
          version: process.env.APP_VERSION,
        };
        // Set headers similarly to the previous API helpers
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
