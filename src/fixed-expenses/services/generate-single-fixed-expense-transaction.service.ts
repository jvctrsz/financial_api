import { Injectable } from '@nestjs/common';
import { FixedExpense, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

type GenerateSingleFixedExpenseTransactionParams = {
  userId: string;
  periodId: string;
  referenceMonth: Date;
  fixedExpense: FixedExpense;
};

@Injectable()
export class GenerateSingleFixedExpenseTransactionService {
  constructor(
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  generateSingleFixedExpenseTransaction = async (
    params: GenerateSingleFixedExpenseTransactionParams,
    prismaClient?: PrismaTransactionClient,
  ) => {
    const { userId, periodId, referenceMonth, fixedExpense } = params;

    return this.createTransactionService.createTransactionInternal(
      {
        userId,
        categoryId: fixedExpense.categoryId,
        cardId: fixedExpense.cardId,
        periodId,
        installmentExpenseId: null,
        fixedExpenseId: fixedExpense.id,
        paid:
          fixedExpense.paymentMethod === TransactionType.CREDIT ? null : false,
        type: fixedExpense.paymentMethod,
        amount: Number(fixedExpense.amount),
        description: fixedExpense.name,
        transactionDate: referenceMonth,
        billingDate: referenceMonth,
      },
      prismaClient,
    );
  };
}

