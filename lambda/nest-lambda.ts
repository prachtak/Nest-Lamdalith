import 'reflect-metadata';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseEnvelopeInterceptor } from '../src/common/response-envelope.interceptor';
import { AppExceptionFilter } from '../src/common/app-exception.filter';

let cachedHandler: any; // serverless-express handler

async function bootstrapServer() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, { logger: ['error', 'warn', 'log'] });

  // Global validation (DTOs)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));

  // Global envelope + error mapping
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AppExceptionFilter());

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }
  return cachedHandler(event, context);
};
