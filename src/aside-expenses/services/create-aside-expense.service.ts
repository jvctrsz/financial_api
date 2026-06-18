import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAsideExpenseDto } from '../dto/create-aside-expense.dto';
import { normalizeAsideExpenseMonth } from './aside-expense-month.util';

@Injectable()
export class CreateAsideExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  createAsideExpense = async (userId: string, dto: CreateAsideExpenseDto) => {
    const recurrent = dto.recurrent ?? false;
    const startMonth = normalizeAsideExpenseMonth(dto.startMonth);
    const endMonth = dto.endMonth
      ? normalizeAsideExpenseMonth(dto.endMonth)
      : null;

    if (!recurrent && endMonth) {
      throw new BadRequestException(
        'Gasto a parte não recorrente não pode ter endMonth.',
      );
    }

    if (recurrent && endMonth && endMonth < startMonth) {
      throw new BadRequestException(
        'endMonth deve ser maior ou igual a startMonth.',
      );
    }

    return this.prisma.asideExpense.create({
      data: {
        userId,
        description: dto.description,
        amount: dto.amount,
        recurrent,
        startMonth,
        endMonth,
        deletedAt: null,
      },
    });
  };
}
