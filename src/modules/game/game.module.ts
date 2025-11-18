import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GAME_REPOSITORY } from '../../common/tokens';
import { DynamoGameRepository } from '../../infrastructure/repositories/DynamoGameRepository';
import { GameService } from '../../application/services/GameService';
import { loadConfig } from '../../config';

@Module({
  controllers: [GameController],
  providers: [
    // Repository binding
    {
      provide: GAME_REPOSITORY,
      useFactory: () => {
        const cfg = loadConfig();
        return new DynamoGameRepository({ tableName: cfg.tableName });
      },
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
