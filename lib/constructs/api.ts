import {Construct} from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface ApiProps {
  handler: lambda.IFunction;
  stageName?: string;
  apiName?: string;
}

export class Api extends Construct {
  public readonly restApi: apigw.LambdaRestApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const isProd = ['prod', 'production'].includes((props.stageName ?? 'dev').toLowerCase());
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    this.restApi = new apigw.LambdaRestApi(this, 'GameApi', {
      handler: props.handler,
      proxy: true,
      restApiName: props.apiName ?? 'Guess Game Service API',
      deployOptions: {
        stageName: props.stageName ?? 'dev',
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        metricsEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        throttlingRateLimit: isProd ? 1000 : 100,
        throttlingBurstLimit: isProd ? 2000 : 200,
      },
    });
  }
}
