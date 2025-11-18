import { Module } from '@nestjs/common';
import { GameModule } from './modules/game/game.module';

@Module({
  imports: [GameModule],
})
export class AppModule {}
