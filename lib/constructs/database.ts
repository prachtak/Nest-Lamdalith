import {Construct} from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface DatabaseProps {
  tableName?: string;
  partitionKeyName?: string;
  removalPolicy?: cdk.RemovalPolicy;
  stageName?: string;
}

export class Database extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps = {}) {
    super(scope, id);

    const tableName = props.tableName ?? 'games';
    const partitionKeyName = props.partitionKeyName ?? 'gameId';
    const isProd = ['prod', 'production'].includes((props.stageName ?? 'dev').toLowerCase());

    this.table = new dynamodb.Table(this, 'Table', {
      tableName,
      partitionKey: { name: partitionKeyName, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProd,
      encryption: isProd ? dynamodb.TableEncryption.AWS_MANAGED : dynamodb.TableEncryption.DEFAULT,
    });
  }
}
