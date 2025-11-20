import {DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {mockClient} from 'aws-sdk-client-mock';
import {DynamoGameRepository} from '../../../../src/infrastructure/repositories/DynamoGameRepository';
import {Game} from '../../../../src/domain/models/Game';

describe('DynamoGameRepository', () => {
    const ddbMock = mockClient(DynamoDBDocumentClient);
    let repository: DynamoGameRepository;
    const tableName = 'test-games-table';

    beforeEach(() => {
        ddbMock.reset();
        const mockDocClient = ddbMock as unknown as DynamoDBDocumentClient;
        repository = new DynamoGameRepository({tableName, docClient: mockDocClient});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a game in DynamoDB', async () => {
            const game: Game = {
                gameId: 'test-game-123',
                gameRandomNumber: 42,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            };

            ddbMock.on(PutCommand).resolves({});

            await repository.create(game);

            expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
            const putCall = ddbMock.commandCalls(PutCommand)[0];
            expect(putCall.args[0].input).toEqual({
                TableName: tableName,
                Item: game,
            });
        });

        it('should handle DynamoDB errors during create', async () => {
            const game: Game = {
                gameId: 'test-game-123',
                gameRandomNumber: 42,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 0,
                guessHistory: [],
            };

            ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));

            await expect(repository.create(game)).rejects.toThrow('DynamoDB error');
        });
    });

    describe('get', () => {
        it('should retrieve a game from DynamoDB', async () => {
            const gameId = 'test-game-456';
            const mockGame: Game = {
                gameId,
                gameRandomNumber: 75,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 3,
                guessHistory: [20, 50, 60],
            };

            ddbMock.on(GetCommand).resolves({Item: mockGame});

            const result = await repository.get(gameId);

            expect(result).toEqual(mockGame);
            expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
            const getCall = ddbMock.commandCalls(GetCommand)[0];
            expect(getCall.args[0].input).toEqual({
                TableName: tableName,
                Key: {gameId},
            });
        });

        it('should return null when game is not found', async () => {
            const gameId = 'non-existent-game';

            ddbMock.on(GetCommand).resolves({Item: undefined});

            const result = await repository.get(gameId);

            expect(result).toBeNull();
        });

        it('should handle DynamoDB errors during get', async () => {
            const gameId = 'test-game-456';

            ddbMock.on(GetCommand).rejects(new Error('DynamoDB get error'));

            await expect(repository.get(gameId)).rejects.toThrow('DynamoDB get error');
        });
    });

    describe('update', () => {
        it('should update a game in DynamoDB', async () => {
            const game: Game = {
                gameId: 'test-game-789',
                gameRandomNumber: 33,
                createdAt: new Date().toISOString(),
                finished: true,
                won: true,
                attempts: 5,
                guessHistory: [10, 20, 30, 35, 33],
                finishedAt: new Date().toISOString(),
            };

            ddbMock.on(UpdateCommand).resolves({});

            await repository.update(game);

            expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
            const updateCall = ddbMock.commandCalls(UpdateCommand)[0];
            expect(updateCall.args[0].input).toEqual({
                TableName: tableName,
                Key: {gameId: game.gameId},
                UpdateExpression: 'SET attempts = :attempts, guessHistory = :guessHistory, finished = :finished, won = :won, finishedAt = :finishedAt',
                ExpressionAttributeValues: {
                    ':attempts': game.attempts,
                    ':guessHistory': game.guessHistory,
                    ':finished': game.finished,
                    ':won': game.won,
                    ':finishedAt': game.finishedAt,
                },
            });
        });

        it('should handle DynamoDB errors during update', async () => {
            const game: Game = {
                gameId: 'test-game-789',
                gameRandomNumber: 33,
                createdAt: new Date().toISOString(),
                finished: true,
                won: false,
                attempts: 10,
                guessHistory: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                finishedAt: new Date().toISOString(),
            };

            ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB update error'));

            await expect(repository.update(game)).rejects.toThrow('DynamoDB update error');
        });

        it('should update game with undefined won field', async () => {
            const game: Game = {
                gameId: 'test-game-ongoing',
                gameRandomNumber: 50,
                createdAt: new Date().toISOString(),
                finished: false,
                attempts: 2,
                guessHistory: [25, 40],
            };

            ddbMock.on(UpdateCommand).resolves({});

            await repository.update(game);

            const updateCall = ddbMock.commandCalls(UpdateCommand)[0];
            expect(updateCall.args[0].input.ExpressionAttributeValues?.[':won']).toBeUndefined();
            expect(updateCall.args[0].input.ExpressionAttributeValues?.[':finishedAt']).toBeUndefined();
        });
    });
});
