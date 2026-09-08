import { TransactionType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
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

  @IsInt()
  @Min(1)
  @Max(31)
  chargeDay: number;

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
