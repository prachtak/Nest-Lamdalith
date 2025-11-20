import 'reflect-metadata';
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {NestFactory} from '@nestjs/core';
import {ExpressAdapter} from '@nestjs/platform-express';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import {AppModule} from '../src/app.module';
import {ResponseEnvelopeInterceptor} from '../src/common/response-envelope.interceptor';
import {AppExceptionFilter} from '../src/common/app-exception.filter';
import helmet from 'helmet';
import {randomUUID} from 'crypto';
import {ConfigService} from '@nestjs/config';

let cachedHandler: any;

async function bootstrapServer() {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, adapter, {logger: ['error', 'warn', 'log']});

    // Config
    const config = app.get(ConfigService);

    // Security headers
    expressApp.use(helmet());

    // Correlation-id + timing middleware
    expressApp.use((req, res, next) => {
        (req as any).startedAt = Date.now();
        const headerId = (req.headers['x-correlation-id'] as string) || undefined;
        const correlationId = headerId || randomUUID();
        (req as any).correlationId = correlationId;
        res.setHeader('X-Correlation-Id', correlationId);
        next();
    });

    // CORS (configurable)
    const origins = (config.get<string>('ALLOWED_ORIGINS') || '').trim();
    const allowedOrigins = origins ? origins.split(',').map((s) => s.trim()).filter(Boolean) : ['*'];
    app.enableCors({
        origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? true : allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
        exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
        maxAge: 600,
    });

    // Global envelope + error mapping
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new AppExceptionFilter());

    await app.init();
    return serverlessExpress({app: expressApp});
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    if (!cachedHandler) {
        cachedHandler = await bootstrapServer();
    }
    return cachedHandler(event, context);
};
