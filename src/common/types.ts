import {Request as ExpressRequest} from 'express';

export interface AppRequest extends ExpressRequest {
    correlationId: string;
    startedAt: number;
}
