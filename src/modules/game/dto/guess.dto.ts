import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class GuessDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @Transform(({ value }) => (typeof value === 'number' ? value : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  guess!: number;
}
