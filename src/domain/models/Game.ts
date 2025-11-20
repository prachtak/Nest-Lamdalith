export interface Game {
  gameId: string;
  gameRandomNumber: number; // random number between 1 and 100
  createdAt: string; // ISO string
  finished: boolean; // true if game is completed (won or lost)
  won?: boolean; // true if player won, false if lost (after max attempts)
  attempts: number; // number of guesses made
  guessHistory: number[]; // history of all guesses
  finishedAt?: string; // ISO string, when game ended
}
