import {GameService} from '../../../../src/application/services/GameService';
import {GameRepository} from '../../../../src/domain/repositories/GameRepository';
import {Game} from '../../../../src/domain/models/Game';
import {ConflictError, NotFoundError} from '../../../../src/application/errors/AppError';

describe('GameService (Simple)', () => {
    let service: GameService;
    let mockRepository: jest.Mocked<GameRepository>;

    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
        };

        service = new GameService(mockRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startGame', () => {
        it('should create a new game with correct initial state', async () => {
            mockRepository.create.mockResolvedValue(undefined);

            const result = await service.startGame();

            expect(result).toHaveProperty('gameId');
            expect(result).toHaveProperty('message', 'Game started. Make a guess between 1 and 100.');
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameId: expect.any(String),
                    gameRandomNumber: expect.any(Number),
                    createdAt: expect.any(String),
                    finished: false,
                    attempts: 0,
                    guessHistory: [],
                })
            );
        });

        it('should generate random number between 1 and 100', async () => {
            mockRepository.create.mockResolvedValue(undefined);

            await service.startGame();

            const createdGame = mockRepository.create.mock.calls[0][0];
            expect(createdGame.gameRandomNumber).toBeGreaterThanOrEqual(1);
            expect(createdGame.gameRandomNumber).toBeLessThanOrEqual(100);
        });
    });

    describe('makeGuess', () => {
        const gameId = 'test-game-id';
        const createMockGame = (overrides: Partial<Game> = {}): Game => ({
            gameId,
            gameRandomNumber: 50,
            createdAt: new Date().toISOString(),
            finished: false,
            attempts: 0,
            guessHistory: [],
            ...overrides,
        });

        it('should throw NotFoundError if game does not exist', async () => {
            mockRepository.get.mockResolvedValue(null);

            await expect(service.makeGuess(gameId, 50)).rejects.toThrow(NotFoundError);
            expect(mockRepository.get).toHaveBeenCalledWith(gameId);
        });

        it('should throw ConflictError if game is already finished (won)', async () => {
            const finishedGame = createMockGame({finished: true, won: true});
            mockRepository.get.mockResolvedValue(finishedGame);

            await expect(service.makeGuess(gameId, 50)).rejects.toThrow(ConflictError);
        });

        it('should return correct message when guess is correct', async () => {
            const game = createMockGame({gameRandomNumber: 42});
            mockRepository.get.mockResolvedValue(game);
            mockRepository.update.mockResolvedValue(undefined);

            const result = await service.makeGuess(gameId, 42);

            expect(result.message).toBe("Correct! You've guessed the number 42 in 1 attempt(s).");
            expect(result.guessHistory).toEqual([42]);
            expect(mockRepository.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    finished: true,
                    won: true,
                    attempts: 1,
                    guessHistory: [42],
                    finishedAt: expect.any(String),
                })
            );
        });

        it('should return "Too low" when guess is lower than target', async () => {
            const game = createMockGame({gameRandomNumber: 50});
            mockRepository.get.mockResolvedValue(game);
            mockRepository.update.mockResolvedValue(undefined);

            const result = await service.makeGuess(gameId, 30);

            expect(result.message).toBe('Too low. Try again!');
            expect(result.attemptsLeft).toBe(9);
            expect(result.guessHistory).toEqual([30]);
        });

        it('should end game with loss after 10 attempts', async () => {
            const game = createMockGame({
                gameRandomNumber: 50,
                attempts: 9,
                guessHistory: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            });
            mockRepository.get.mockResolvedValue(game);
            mockRepository.update.mockResolvedValue(undefined);

            const result = await service.makeGuess(gameId, 99);

            expect(result.message).toBe("Game over! You've used all 10 attempts. The number was 50.");
            expect(result.guessHistory).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 99]);
            expect(mockRepository.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    finished: true,
                    won: false,
                    attempts: 10,
                })
            );
        });
    });
});
