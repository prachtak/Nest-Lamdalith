import {Controller, Get, HttpCode, HttpStatus, Inject} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DynamoDBDocumentClient, GetCommand} from '@aws-sdk/lib-dynamodb';
import {DYNAMO_DOC_CLIENT} from '../../common/tokens';
import {ServiceUnavailableError} from '../../application/errors/AppError';

@Controller()
export class HealthController {
    constructor(
        @Inject(ConfigService) private readonly config: ConfigService,
        @Inject(DYNAMO_DOC_CLIENT) private readonly docClient: DynamoDBDocumentClient,
    ) {
    }

    @Get('health')
    @HttpCode(HttpStatus.OK)
    liveness() {
        return {status: 'ok'};
    }

    @Get('ready')
    async readiness() {
        const table = this.config.get<string>('TABLE_NAME', 'games');
        try {
            await this.docClient.send(new GetCommand({TableName: table, Key: {gameId: '__health__'}}));
            return {status: 'ready', dependencies: {dynamo: 'ok'}};
        } catch (e) {
            throw new ServiceUnavailableError('Dependency not ready: DynamoDB', {
                dependency: 'dynamo',
                message: (e as Error).message,
            });
        }
    }
}
