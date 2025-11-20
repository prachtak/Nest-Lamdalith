import {Module} from '@nestjs/common';
import {GameModule} from './modules/game/game.module';
import {ConfigModule} from '@nestjs/config';
import {LoggerModule} from 'nestjs-pino';
import Joi from 'joi';
import {HealthModule} from './modules/health/health.module';

const isLocal =
    process.env.NODE_ENV === 'local' ||
    (!process.env.AWS_LAMBDA_FUNCTION_NAME &&
        (process.env.STAGE === 'dev' || !process.env.STAGE));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.STAGE || process.env.NODE_ENV || 'dev'}`,
        '.env',
      ],
      validationSchema: Joi.object({
        TABLE_NAME: Joi.string().default('games'),
        STAGE: Joi.string().default('dev'),
        REGION: Joi.string().default('eu-central-1'),
        APP_VERSION: Joi.string().optional(),
        DYNAMO_ENDPOINT: Joi.string().uri().optional(),
        ALLOWED_ORIGINS: Joi.string().optional(),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.STAGE === 'dev' ? 'debug' : 'info',
        autoLogging: false,
        redact: {
          paths: ['req.headers.authorization'],
          remove: true,
        },
        transport: isLocal
            ? {
              target: 'pino-pretty',
              options: {colorize: true, translateTime: 'SYS:standard'},
            }
            : undefined,
      },
    }),
    HealthModule,
    GameModule,
  ],
})
export class AppModule {}
