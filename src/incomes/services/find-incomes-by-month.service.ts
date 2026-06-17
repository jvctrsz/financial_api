import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeIncomeMonth } from './income-month.util';

@Injectable()
export class FindIncomesByMonthService {
  constructor(private readonly prisma: PrismaService) {}

  findIncomesByMonth = async (userId: string, month?: string) => {
    if (!month) {
      throw new BadRequestException('Informe month para listar entradas.');
    }

    const normalizedMonth = normalizeIncomeMonth(month);

    return this.prisma.income.findMany({
      where: {
        userId,
        month: normalizedMonth,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  };
}
