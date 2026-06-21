import { BadRequestException, Injectable } from '@nestjs/common';
import { Card, TransactionType } from '@prisma/client';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import {
  firstDayOfUtcMonth,
  parseDateOnly,
} from '../../salaries/utils/date-only.util';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';
import { CreateFixedExpenseDto } from '../dto/create-fixed-expense.dto';

const toCents = (value: number): number => Math.round(value * 100);

@Injectable()
export class CreateFixedExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  createFixedExpense = async (userId: string, dto: CreateFixedExpenseDto) => {
    const startMonth = parseDateOnly(dto.startMonth);

    this.validateStartMonth(startMonth);
    this.validateInstallmentTotal(dto);

    const category = await this.findSubcategory(userId, dto.categoryId);
    const card = dto.cardId ? await this.findCard(userId, dto.cardId) : null;

    return this.prisma.$transaction(async (tx) => {
      const fixedExpense = await tx.fixedExpense.create({
        data: {
          userId,
          categoryId: category.id,
          cardId: card?.id ?? null,
          description: dto.description,
          totalAmount: dto.totalAmount,
          installmentAmount: dto.installmentAmount,
          totalInstallments: dto.totalInstallments,
          startMonth,
          deletedAt: null,
        },
      });

      for (let index = 0; index < dto.totalInstallments; index += 1) {
        const baseDate = firstDayOfUtcMonth(addMonths(startMonth, index));
        const billingDate = this.calculateInstallmentBillingDate(
          baseDate,
          card,
        );
        const type = card ? TransactionType.CREDIT : TransactionType.DEBIT;
        const period = await tx.salaryPeriod.findFirst({
          where: {
            userId,
            referenceMonth: firstDayOfUtcMonth(billingDate),
          },
        });

        await this.createTransactionService.createFixedExpenseInstallment(
          {
            userId,
            categoryId: category.id,
            cardId: card?.id ?? null,
            fixedExpenseId: fixedExpense.id,
            periodId: period?.id ?? null,
            type,
            amount: dto.installmentAmount,
            description: `${dto.description} — Parcela ${index + 1}/${dto.totalInstallments}`,
            transactionDate: baseDate,
            billingDate,
          },
          tx,
        );
      }

      return fixedExpense;
    });
  };

  private findSubcategory = async (userId: string, categoryId: string) => {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        deletedAt: null,
      },
    });

    if (!category || category.parentId === null) {
      throw new BadRequestException(
        'Gasto fixo deve referenciar uma subcategoria válida.',
      );
    }

    return category;
  };

  private findCard = async (userId: string, cardId: string) => {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
      },
    });

    if (!card) {
      throw new BadRequestException('Cartão não encontrado.');
    }

    return card;
  };

  private validateStartMonth = (startMonth: Date) => {
    if (startMonth.getUTCDate() !== 1) {
      throw new BadRequestException(
        'startMonth deve representar o primeiro dia do mês.',
      );
    }
  };

  private validateInstallmentTotal = (dto: CreateFixedExpenseDto) => {
    const totalInCents = toCents(dto.totalAmount);
    const installmentsInCents =
      toCents(dto.installmentAmount) * dto.totalInstallments;

    if (totalInCents !== installmentsInCents) {
      throw new BadRequestException(
        'installmentAmount multiplicado por totalInstallments deve ser igual a totalAmount.',
      );
    }
  };

  private calculateInstallmentBillingDate = (
    baseDate: Date,
    card: Card | null,
  ) => {
    if (!card) {
      return baseDate;
    }

    return calculateCreditBillingDate(baseDate, card.closingDay);
  };
}
