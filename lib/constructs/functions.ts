import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface FunctionsProps {
  table: dynamodb.ITable;
  runtime?: lambda.Runtime;
  environment?: Record<string, string>;
}

export class Functions extends Construct {
  public readonly apiFunction: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsProps) {
    super(scope, id);

    const runtime = props.runtime ?? lambda.Runtime.NODEJS_20_X;

    this.apiFunction = new lambdaNodejs.NodejsFunction(this, 'ApiFunction', {
      entry: 'lambda/nest-lambda.ts',
      handler: 'handler',
      runtime,
      environment: {
        TABLE_NAME: props.table.tableName,
        ...(props.environment ?? {}),
      },
    });

    // Grant read+write to single API function (it handles both start & guess)
    props.table.grantReadWriteData(this.apiFunction);
  }
}
