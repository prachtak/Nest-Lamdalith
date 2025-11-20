import {Type} from 'class-transformer';
import {IsDefined, IsInt, Max, Min} from 'class-validator';

export class GuessDto {
  @Type(() => Number)
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(100)
  guess!: number;
}
