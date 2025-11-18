import { randomUUID } from 'crypto';
import { Game } from '../../domain/models/Game';
import { GameRepository } from '../../domain/repositories/GameRepository';
import { NotFoundError } from '../errors/AppError';

export class GameService {
  constructor(private readonly repo: GameRepository) {
  }

  async startGame(): Promise<{ gameId: string; message: string }> {
    const game: Game = {
      gameId: randomUUID(),
      gameRandomNumber: this.generateRandomNumber(),
      createdAt: new Date().toISOString()
    };

    await this.repo.create(game);

    return {
      gameId: game.gameId,
      message: 'Game started. Make a guess between 1 and 100.'
    };
  }

  async makeGuess(gameId: string, guess: number): Promise<{ message: string }> {
    const game = await this.repo.get(gameId);
    if (!game) {
      throw new NotFoundError('Game not found. Start a new game with /start-game');
    }

    const result = this.evaluateGuess(guess, game.gameRandomNumber);
    return { message: result };
  }

  private generateRandomNumber(): number {
    return Math.floor(Math.random() * 100) + 1;
  }

  private evaluateGuess(guess: number, target: number): string {
    if (guess < target) return 'Too low. Try again!';
    if (guess > target) return 'Too high. Try again!';
    return "Correct! You've guessed the number.";
  }
}
