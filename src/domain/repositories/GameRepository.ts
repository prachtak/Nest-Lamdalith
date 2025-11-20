import {Game} from '../models/Game';

export interface GameRepository {
  create(game: Game): Promise<void>;
  get(gameId: string): Promise<Game | null>;

  update(game: Game): Promise<void>;
}
