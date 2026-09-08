import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';
import { resolveInstallmentTemporalStatus } from '../../shared/helpers/installment-temporal-status.helper';

@Injectable()
export class FindAllInstallmentExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllInstallmentExpenses = async (userId: string) => {
    const installmentExpenses = await this.prisma.installmentExpense.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        card: {
          select: {
            id: true,
            name: true,
          },
        },
        transactions: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            transactionDate: true,
            billingDate: true,
            periodId: true,
            deletedAt: true,
            type: true,
          },
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
      orderBy: [{ startMonth: 'desc' }, { createdAt: 'desc' }],
    });

    const currentDate = todayAsUtcDateOnly();

    return installmentExpenses.map((installmentExpense) => ({
      ...installmentExpense,
      transactions: installmentExpense.transactions.map((transaction) => ({
        ...transaction,
        temporalStatus: resolveInstallmentTemporalStatus(
          transaction.billingDate,
          currentDate,
        ),
      })),
    }));
  };
}
