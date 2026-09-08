import { InstallmentPaymentMethod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInstallmentExpenseDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @IsNumber()
  @Min(0.01)
  installmentAmount: number;

  @IsInt()
  @Min(1)
  totalInstallments: number;

  @IsEnum(InstallmentPaymentMethod)
  paymentMethod: InstallmentPaymentMethod;

  @IsDateString()
  purchaseDate: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  cardId?: string;
}
