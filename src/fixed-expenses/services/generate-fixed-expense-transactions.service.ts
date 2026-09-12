import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

type GenerateFixedExpenseTransactionsParams = {
  userId: string;
  periodId: string;
  referenceMonth: Date;
  paidAt: Date;
};

@Injectable()
export class GenerateFixedExpenseTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateSingleFixedExpenseTransactionService: GenerateSingleFixedExpenseTransactionService,
  ) {}

  generateFixedExpenseTransactions = async (
    params: GenerateFixedExpenseTransactionsParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { userId, periodId, referenceMonth, paidAt } = params;
    const fixedExpenses = await prismaClient.fixedExpense.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            endMonth: null,
          },
          {
            endMonth: {
              gte: referenceMonth,
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const transactions: unknown[] = [];

    for (const fixedExpense of fixedExpenses) {
      const transaction =
        await this.generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction(
          {
            userId,
            periodId,
            referenceMonth,
            paidAt,
            fixedExpense,
          },
          prismaClient,
        );

      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions;
  };
}
