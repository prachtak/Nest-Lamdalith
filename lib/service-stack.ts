import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Database} from './constructs/database';
import {Functions} from './constructs/functions';
import {Api} from './constructs/api';

export interface ServiceStackProps extends cdk.StackProps {
  serviceName?: string;
  stageName?: string;
}

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps = {}) {
    super(scope, id, props);

    const stageName = props.stageName ?? 'dev';
    const isProd = ['prod', 'production'].includes(stageName.toLowerCase());

    // Database layer (DynamoDB)
    const db = new Database(this, 'Database', {
      tableName: 'games',
      partitionKeyName: 'gameId',
      stageName,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Compute layer (Lambda)
    const fns = new Functions(this, 'Functions', {
      table: db.table,
      stageName,
      environment: {
        STAGE: stageName,
      },
    });

    // API layer (API Gateway)
    const api = new Api(this, 'Api', {
      handler: fns.apiFunction,
      stageName,
      apiName: `${props.serviceName ?? 'Guess The Number Service'}`,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.restApi.url ?? 'n/a' });
  }
}
