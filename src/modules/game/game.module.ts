import {Module} from '@nestjs/common';
import {GameController} from './game.controller';
import {DYNAMO_DOC_CLIENT, GAME_REPOSITORY} from '../../common/tokens';
import {DynamoGameRepository} from '../../infrastructure/repositories/DynamoGameRepository';
import {GameService} from '../../application/services/GameService';
import {ConfigService} from '@nestjs/config';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';
import {AwsModule} from '../../infrastructure/aws/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [GameController],
  providers: [
    // Repository binding
    {
      provide: GAME_REPOSITORY,
      useFactory: (cfg: ConfigService, doc: DynamoDBDocumentClient) => {
        const tableName = cfg.get<string>('TABLE_NAME', 'games');
        return new DynamoGameRepository({tableName, docClient: doc});
      },
      inject: [ConfigService, DYNAMO_DOC_CLIENT],
    },
    // Service binding using repo
    {
      provide: GameService,
      useFactory: (repo: any) => new GameService(repo),
      inject: [GAME_REPOSITORY],
    },
  ],
  exports: [GameService],
})
export class GameModule {}
