import { BadRequestException, Injectable } from '@nestjs/common';
import { FixedExpense, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

type GenerateSingleFixedExpenseTransactionParams = {
  userId: string;
  periodId: string;
  referenceMonth: Date;
  paidAt: Date;
  fixedExpense: FixedExpense;
};

@Injectable()
export class GenerateSingleFixedExpenseTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  generateSingleFixedExpenseTransaction = async (
    params: GenerateSingleFixedExpenseTransactionParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { userId, periodId, paidAt, fixedExpense } = params;
    const billingDate = await this.calculateBillingDate(
      userId,
      fixedExpense,
      paidAt,
      prismaClient,
    );

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
        transactionDate: paidAt,
        billingDate,
      },
      prismaClient,
    );
  };

  private calculateBillingDate = async (
    userId: string,
    fixedExpense: FixedExpense,
    paidAt: Date,
    prismaClient: PrismaTransactionClient,
  ) => {
    if (fixedExpense.paymentMethod !== TransactionType.CREDIT) {
      return paidAt;
    }

    if (!fixedExpense.cardId) {
      throw new BadRequestException('Cartão não encontrado.');
    }

    const card = await prismaClient.card.findFirst({
      where: {
        id: fixedExpense.cardId,
        userId,
      },
    });

    if (!card) {
      throw new BadRequestException('Cartão não encontrado.');
    }

    return calculateCreditBillingDate(paidAt, card.closingDay);
  };
}
