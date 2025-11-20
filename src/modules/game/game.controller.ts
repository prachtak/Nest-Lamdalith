import {Body, Controller, HttpCode, HttpStatus, Inject, Param, Post, Res} from '@nestjs/common';
import {Response} from 'express';
import {GameService} from '../../application/services/GameService';
import {GuessDto} from './dto/guess.dto';
import {DtoValidationPipe} from '../../common/pipes/dto-validation.pipe';

@Controller('games')
export class GameController {
  constructor(@Inject(GameService) private readonly service: GameService) {
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startGame(@Res({ passthrough: true }) res: Response) {
    const result = await this.service.startGame();
    res.setHeader('Location', `/games/${result.gameId}`);
    return result;
  }

  @Post(':gameId/guesses')
  @HttpCode(HttpStatus.OK)
  async guess(
      @Param('gameId') gameId: string,
      @Body(new DtoValidationPipe(GuessDto)) dto: GuessDto,
  ) {
    return await this.service.makeGuess(gameId, dto.guess);
  }
}
