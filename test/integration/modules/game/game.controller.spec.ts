import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import request from 'supertest';
import {GameController} from '../../../../src/modules/game/game.controller';
import {GameService} from '../../../../src/application/services/GameService';
import {GameRepository} from '../../../../src/domain/repositories/GameRepository';
import {ResponseEnvelopeInterceptor} from '../../../../src/common/response-envelope.interceptor';
import {AppExceptionFilter} from '../../../../src/common/app-exception.filter';

describe('GameController (Integration)', () => {
    let app: INestApplication;
    let mockRepository: jest.Mocked<GameRepository>;
    let gameService: GameService;

    beforeEach(async () => {
        mockRepository = {
            create: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
        };

        // Create GameService directly instead of via DI
        gameService = new GameService(mockRepository);

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [
                {
                    provide: GameService,
                    useValue: gameService,
                },
            ],
        }).compile();

        app = module.createNestApplication();

        app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
        app.useGlobalFilters(new AppExceptionFilter());

        await app.init();
    });

    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('POST /games', () => {
        it('should create a new game and return 201', async () => {
            mockRepository.create.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post('/games')
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    gameId: expect.any(String),
                    message: 'Game started. Make a guess between 1 and 100.',
                },
                meta: expect.objectContaining({
                    requestId: expect.any(String),
                    timestamp: expect.any(String),
                }),
            });

            expect(response.headers.location).toMatch(/\/games\/[\w-]+/);
        });

        it('should create game with proper envelope structure', async () => {
            mockRepository.create.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post('/games')
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('correlationId');
        });
    });

    describe('POST /games/:gameId/guesses', () => {
        // Valid UUID v4 for parameter validation
        const gameId = '123e4567-e89b-42d3-a456-426614174000';

        it('should accept a valid guess and return 200', async () => {
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: 50,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            });
            mockRepository.update.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 25})
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('message');
            expect(response.body.data).toHaveProperty('attemptsLeft');
        });

        it('should return 400 for guess below 1', async () => {
            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 0})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 400 for guess above 100', async () => {
            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 101})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 400 for non-integer guess', async () => {
            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 42.5})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 400 for missing guess', async () => {
            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 404 for non-existent game', async () => {
            mockRepository.get.mockResolvedValue(null);

            const response = await request(app.getHttpServer())
                .post(`/games/123e4567-e89b-42d3-a456-426614174999/guesses`)
                .send({guess: 50})
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should return 409 for already finished game', async () => {
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: 50,
                createdAt: new Date().toISOString(),
                finished: true,
                won: true,
                attempts: 5,
                guessHistory: [25, 40, 45, 48, 50],
            });

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 50})
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('CONFLICT');
        });

        it('should return correct hint for low guess', async () => {
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: 75,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            });
            mockRepository.update.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 30})
                .expect(200);

            expect(response.body.data.message).toBe('Too low. Try again!');
            expect(response.body.data.attemptsLeft).toBe(9);
        });

        it('should return correct hint for high guess', async () => {
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: 25,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            });
            mockRepository.update.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 80})
                .expect(200);

            expect(response.body.data.message).toBe('Too high. Try again!');
            expect(response.body.data.attemptsLeft).toBe(9);
        });

        it('should return success message for correct guess', async () => {
            const targetNumber = 42;
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: targetNumber,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 2,
                guessHistory: [30, 40],
            });
            mockRepository.update.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: targetNumber})
                .expect(200);

            expect(response.body.data.message).toContain('Correct!');
            expect(response.body.data.message).toContain('3 attempt(s)');
            expect(response.body.data.guessHistory).toHaveLength(3);
        });

        it('should handle string guess by transforming to number', async () => {
            mockRepository.get.mockResolvedValue({
                gameId,
                gameRandomNumber: 50,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            });
            mockRepository.update.mockResolvedValue(undefined);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: '42'})
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Error handling', () => {
        const gameId = '123e4567-e89b-42d3-a456-426614174000';

        it('should return proper error envelope structure', async () => {
            mockRepository.get.mockResolvedValue(null);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 50})
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: {
                    code: expect.any(String),
                    message: expect.any(String),
                },
                meta: expect.objectContaining({
                    requestId: expect.any(String),
                    correlationId: expect.any(String),
                    timestamp: expect.any(String),
                }),
            });
        });

        it('should include X-Correlation-Id header in error responses', async () => {
            mockRepository.get.mockResolvedValue(null);

            const response = await request(app.getHttpServer())
                .post(`/games/${gameId}/guesses`)
                .send({guess: 50})
                .expect(404);

            expect(response.headers['x-correlation-id']).toBeDefined();
        });
    });
});
