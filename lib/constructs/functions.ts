import {Construct} from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as fs from 'fs';

export interface FunctionsProps {
  table: dynamodb.ITable;
  runtime?: lambda.Runtime;
  environment?: Record<string, string>;
  stageName?: string;
}

export class Functions extends Construct {
  public readonly apiFunction: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsProps) {
    super(scope, id);

    const runtime = props.runtime ?? lambda.Runtime.NODEJS_20_X;
    const region = cdk.Stack.of(this).region;
    const pkgPath = path.join(process.cwd(), 'package.json');
    const appVersion = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version ?? '0.0.0' : '0.0.0';

    const isProd = ['prod', 'production'].includes((props.stageName ?? 'dev').toLowerCase());
    const memorySize = isProd ? 1024 : 512;
    const timeout = isProd ? cdk.Duration.seconds(30) : cdk.Duration.seconds(10);
    const logRetention = isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK;

    this.apiFunction = new lambdaNodejs.NodejsFunction(this, 'ApiFunction', {
      entry: 'lambda/handler.ts',
      handler: 'handler',
      runtime,
      architecture: lambda.Architecture.ARM_64,
      memorySize,
      timeout,
      logRetention,
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: isProd ? undefined : 10,
      bundling: {
        externalModules: [
          'aws-sdk',
          '@nestjs/websockets',
          '@nestjs/websockets/socket-module',
          '@nestjs/microservices',
          '@nestjs/microservices/microservices-module',
          'class-transformer/storage', // Not used, satisfies @nestjs/mapped-types import
        ],
        minify: true,
        sourceMap: true,
        target: 'node20',
        esbuildArgs: {
          '--keep-names': '', // Preserve class/function names for reflection
        },
      },
      environment: {
        TABLE_NAME: props.table.tableName,
        REGION: region,
        APP_VERSION: appVersion,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        NODE_OPTIONS: '--enable-source-maps',
        ...(props.environment ?? {}),
      },
    });

    // Grant read+write to single API function (it handles both start & guess)
    props.table.grantReadWriteData(this.apiFunction);
  }
}
