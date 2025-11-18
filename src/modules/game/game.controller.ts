import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GameService } from '../../application/services/GameService';
import { GuessDto } from './dto/guess.dto';

@Controller()
export class GameController {
  constructor(private readonly service: GameService) {}

  @Post('start-game')
  @HttpCode(HttpStatus.CREATED)
  async startGame(@Res({ passthrough: true }) res: Response) {
    const result = await this.service.startGame();
    res.setHeader('Location', `/games/${result.gameId}`);
    return result;
  }

  @Post('guess')
  async guess(@Body() dto: GuessDto) {
    const result = await this.service.makeGuess(dto.gameId, dto.guess);
    return result;
  }
}
