import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';

@Injectable()
export class DeleteFixedExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  deleteFixedExpense = async (userId: string, fixedExpenseId: string) => {
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

      const deletionCutoff = await this.resolveDeletionCutoff(
        tx,
        userId,
        fixedExpense.cardId,
      );
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
            gte: deletionCutoff,
          },
        },
        data: {
          deletedAt,
        },
      });

      return deletedFixedExpense;
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
