import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ApiProps {
  handler: lambda.IFunction;
  stageName?: string;
  apiName?: string;
}

export class Api extends Construct {
  public readonly restApi: apigw.LambdaRestApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    this.restApi = new apigw.LambdaRestApi(this, 'GameApi', {
      handler: props.handler,
      proxy: true,
      restApiName: props.apiName ?? 'Guess Game Service API',
      deployOptions: {
        stageName: props.stageName ?? 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });
  }
}
