import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Max(31)
  closingDay: number;
}
