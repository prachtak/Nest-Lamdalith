import {DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {Game} from '../../domain/models/Game';
import {GameRepository} from '../../domain/repositories/GameRepository';

export class DynamoGameRepository implements GameRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(params: { tableName: string; docClient: DynamoDBDocumentClient }) {
    this.tableName = params.tableName;
    this.docClient = params.docClient;
  }

  async create(game: Game): Promise<void> {
    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: game })
    );
  }

  async get(gameId: string): Promise<Game | null> {
    const out = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { gameId } })
    );
    return (out.Item as Game) ?? null;
  }

  async update(game: Game): Promise<void> {
    const updateParts: string[] = [
      'attempts = :attempts',
      'guessHistory = :guessHistory',
      'finished = :finished',
    ];
    const values: Record<string, any> = {
      ':attempts': game.attempts,
      ':guessHistory': game.guessHistory,
      ':finished': game.finished,
    };

    if (game.won !== undefined) {
      updateParts.push('won = :won');
      values[':won'] = game.won;
    }

    if (game.finishedAt !== undefined) {
      updateParts.push('finishedAt = :finishedAt');
      values[':finishedAt'] = game.finishedAt;
    }

    await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {gameId: game.gameId},
          UpdateExpression: `SET ${updateParts.join(', ')}`,
          ExpressionAttributeValues: values,
        })
    );
  }
}
