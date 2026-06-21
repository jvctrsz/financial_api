import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';

@Injectable()
export class DeleteFixedExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  deleteFixedExpense = async (userId: string, fixedExpenseId: string) => {
    const today = todayAsUtcDateOnly();

    return this.prisma.$transaction(async (tx) => {
      const fixedExpense = await tx.fixedExpense.findFirst({
        where: {
          id: fixedExpenseId,
          userId,
          deletedAt: null,
        },
      });

      if (!fixedExpense) {
        throw new NotFoundException('Gasto fixo não encontrado.');
      }

      const deletedAt = new Date();

      const deletedFixedExpense = await tx.fixedExpense.update({
        where: { id: fixedExpense.id },
        data: { deletedAt },
      });

      await tx.transaction.updateMany({
        where: {
          fixedExpenseId: fixedExpense.id,
          userId,
          deletedAt: null,
          billingDate: {
            gte: today,
          },
        },
        data: {
          deletedAt,
        },
      });

      return deletedFixedExpense;
    });
  };
}
