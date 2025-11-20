import {AppRequest} from './types';

export function getHeader(headers: Record<string, any>, name: string): string | undefined {
    const found = Object.entries(headers || {}).find(([k]) => k.toLowerCase() === name.toLowerCase());
    return (found?.[1] as string) || undefined;
}

export function getRequestContext(req: AppRequest) {
    const apiGwEvent = (req as any)?.apiGateway?.event ?? (req as any)?.requestContext ?? undefined;
    const requestId = apiGwEvent?.requestContext?.requestId || req.headers?.['x-amzn-requestid'] || 'unknown';
    const correlationFromHeader = getHeader(req.headers as Record<string, any> || {}, 'x-correlation-id');
    const correlationId = correlationFromHeader || req.correlationId || requestId;
    const stage = apiGwEvent?.requestContext?.stage || process.env.STAGE;
    return {apiGwEvent, requestId, correlationId, stage};
}
