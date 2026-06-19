import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncomeDto } from '../dto/create-income.dto';
import { normalizeIncomeMonth } from './income-month.util';

@Injectable()
export class CreateIncomeService {
  constructor(private readonly prisma: PrismaService) {}

  createIncome = async (userId: string, dto: CreateIncomeDto) => {
    const month = normalizeIncomeMonth(dto.month);

    return this.prisma.income.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        month,
        includeInBalance: dto.includeInBalance ?? false,
      },
    });
  };
}
