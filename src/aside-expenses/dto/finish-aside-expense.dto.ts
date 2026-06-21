import { IsDateString, IsOptional } from 'class-validator';

export class FinishAsideExpenseDto {
  @IsOptional()
  @IsDateString()
  endMonth?: string | null;
}
