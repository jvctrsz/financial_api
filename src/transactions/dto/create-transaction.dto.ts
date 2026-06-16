import { TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  transactionDate: string;

  @IsUUID()
  categoryId: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsUUID()
  cardId?: string;
}
