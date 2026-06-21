import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';

@Injectable()
export class DeleteInstallmentExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  deleteInstallmentExpense = async (
    userId: string,
    installmentExpenseId: string,
  ) => {
    const today = todayAsUtcDateOnly();

    return this.prisma.$transaction(async (tx) => {
      const installmentExpense = await tx.installmentExpense.findFirst({
        where: {
          id: installmentExpenseId,
          userId,
          deletedAt: null,
        },
      });

      if (!installmentExpense) {
        throw new NotFoundException('Gasto parcelado não encontrado.');
      }

      const deletedAt = new Date();

      const deletedInstallmentExpense = await tx.installmentExpense.update({
        where: { id: installmentExpense.id },
        data: { deletedAt },
      });

      await tx.transaction.updateMany({
        where: {
          installmentExpenseId: installmentExpense.id,
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

      return deletedInstallmentExpense;
    });
  };
}
