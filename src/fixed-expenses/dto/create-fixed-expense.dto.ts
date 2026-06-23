import { TransactionType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateFixedExpenseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsUUID()
  categoryId: string;

  @IsEnum(TransactionType)
  paymentMethod: TransactionType;

  @IsOptional()
  @IsUUID()
  cardId?: string;

  @IsOptional()
  @IsDateString()
  endMonth?: string;

  @IsOptional()
  @IsBoolean()
  startInCurrentPeriod?: boolean;
}
