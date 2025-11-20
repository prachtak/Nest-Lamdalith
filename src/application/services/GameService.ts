import {randomUUID} from 'crypto';
import {Game} from '../../domain/models/Game';
import {GameRepository} from '../../domain/repositories/GameRepository';
import {ConflictError, NotFoundError} from '../errors/AppError';
import {Injectable} from "@nestjs/common";

const MAX_ATTEMPTS = 10;

@Injectable()
export class GameService {
    constructor(private readonly repo: GameRepository) {
    }

    async startGame(): Promise<{ gameId: string; message: string }> {
        const game: Game = {
            gameId: randomUUID(),
            gameRandomNumber: this.generateRandomNumber(),
            createdAt: new Date().toISOString(),
            finished: false,
            attempts: 0,
            guessHistory: [],
        };

        await this.repo.create(game);

        return {
            gameId: game.gameId,
            message: 'Game started. Make a guess between 1 and 100.'
        };
    }

    async makeGuess(gameId: string, guess: number): Promise<{
        message: string;
        attemptsLeft?: number;
        guessHistory?: number[]
    }> {
        const game = await this.getGameOrThrow(gameId);
        this.ensureGameIsActive(game);

        this.processGuess(game, guess);
        await this.repo.update(game);

        return this.createGuessResponse(game, guess);
    }

    private async getGameOrThrow(gameId: string): Promise<Game> {
        const game = await this.repo.get(gameId);
        if (!game) {
            throw new NotFoundError('Game not found. Start a new game with POST /games');
        }
        return game;
    }

    private ensureGameIsActive(game: Game): void {
        if (game.finished) {
            const status = game.won ? 'won' : 'lost';
            throw new ConflictError(`Game already finished. You ${status}. Start a new game.`);
        }
    }

    private processGuess(game: Game, guess: number): void {
        game.attempts += 1;
        game.guessHistory.push(guess);

        const isCorrect = guess === game.gameRandomNumber;
        const attemptsExhausted = game.attempts >= MAX_ATTEMPTS;

        if (isCorrect) {
            this.finishGame(game, true);
        } else if (attemptsExhausted) {
            this.finishGame(game, false);
        }
    }

    private finishGame(game: Game, won: boolean): void {
        game.finished = true;
        game.won = won;
        game.finishedAt = new Date().toISOString();
    }

    private createGuessResponse(game: Game, guess: number): {
        message: string;
        attemptsLeft?: number;
        guessHistory?: number[]
    } {
        if (game.won) {
            return {
                message: `Correct! You've guessed the number ${game.gameRandomNumber} in ${game.attempts} attempt(s).`,
                guessHistory: game.guessHistory
            };
        }

        if (game.finished) {
            return {
                message: `Game over! You've used all ${MAX_ATTEMPTS} attempts. The number was ${game.gameRandomNumber}.`,
                guessHistory: game.guessHistory
            };
        }

        const hint = guess < game.gameRandomNumber ? 'Too low. Try again!' : 'Too high. Try again!';
        return {
            message: hint,
            attemptsLeft: MAX_ATTEMPTS - game.attempts,
            guessHistory: game.guessHistory
        };
    }

    private generateRandomNumber(): number {
        return Math.floor(Math.random() * 100) + 1;
    }
}
