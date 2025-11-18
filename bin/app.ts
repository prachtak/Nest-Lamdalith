#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServiceStack } from '../lib/service-stack';

const app = new cdk.App();

new ServiceStack(app, 'GuessGameServiceStack', {
  env: {
    account: '000000000000',
    region: process.env.AWS_REGION || 'eu-central-1'
  },
  stageName: process.env.STAGE || 'dev',
  serviceName: 'Guess'
});
