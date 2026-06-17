import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteIncomeService {
  constructor(private readonly prisma: PrismaService) {}

  deleteIncome = async (userId: string, incomeId: string) => {
    const income = await this.prisma.income.findFirst({
      where: {
        id: incomeId,
        userId,
        deletedAt: null,
      },
    });

    if (!income) {
      throw new NotFoundException('Entrada mensal não encontrada.');
    }

    return this.prisma.income.update({
      where: { id: income.id },
      data: { deletedAt: new Date() },
    });
  };
}
