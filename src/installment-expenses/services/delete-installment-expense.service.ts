import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';

@Injectable()
export class DeleteInstallmentExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  deleteInstallmentExpense = async (
    userId: string,
    installmentExpenseId: string,
  ) => {
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

      const deletionCutoff = await this.resolveDeletionCutoff(
        tx,
        userId,
        installmentExpense.cardId,
      );
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
            gte: deletionCutoff,
          },
        },
        data: {
          deletedAt,
        },
      });

      return deletedInstallmentExpense;
    });
  };

  private resolveDeletionCutoff = async (
    tx: Prisma.TransactionClient,
    userId: string,
    cardId: string | null,
  ) => {
    const today = todayAsUtcDateOnly();

    if (!cardId) {
      return today;
    }

    const card = await tx.card.findFirst({
      where: {
        id: cardId,
        userId,
      },
    });

    return card ? calculateCreditBillingDate(today, card.closingDay) : today;
  };
}
