import { IsOptional, IsUUID, Matches } from 'class-validator';

export class FindAllTransactionsQueryDto {
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingMonth?: string;
}
