import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Game } from '../../domain/models/Game';
import { GameRepository } from '../../domain/repositories/GameRepository';

export class DynamoGameRepository implements GameRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(params: { tableName: string; client?: DynamoDBClient }) {
    this.tableName = params.tableName;
    const baseClient = params.client ?? new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(baseClient);
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
}
