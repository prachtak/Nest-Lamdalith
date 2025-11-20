import {Module} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';
import {DYNAMO_DB_CLIENT, DYNAMO_DOC_CLIENT} from '../../common/tokens';

@Module({
    providers: [
        {
            provide: DYNAMO_DB_CLIENT,
            useFactory: (cfg: ConfigService) =>
                new DynamoDBClient({
                    region: cfg.get<string>('REGION'),
                    endpoint: cfg.get<string>('DYNAMO_ENDPOINT') || undefined,
                }),
            inject: [ConfigService],
        },
        {
            provide: DYNAMO_DOC_CLIENT,
            useFactory: (db: DynamoDBClient) =>
                DynamoDBDocumentClient.from(db, {
                    marshallOptions: {removeUndefinedValues: true},
                }),
            inject: [DYNAMO_DB_CLIENT],
        },
    ],
    exports: [DYNAMO_DB_CLIENT, DYNAMO_DOC_CLIENT],
})
export class AwsModule {
}
