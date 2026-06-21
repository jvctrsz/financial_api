import {
  IsDateString,
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

  @IsDateString()
  startMonth: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  cardId?: string;
}
