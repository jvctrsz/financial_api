import { IsDateString, IsNumber, Min } from 'class-validator';

export class CreateSalaryDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  paidAt: string;
}
