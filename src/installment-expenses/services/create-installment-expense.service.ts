import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Card,
  InstallmentPaymentMethod,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { firstDayOfUtcMonth } from '../../salaries/utils/date-only.util';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';
import { CreateInstallmentExpenseDto } from '../dto/create-installment-expense.dto';

const toCents = (value: number): number => Math.round(value * 100);
type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CreateInstallmentExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  createInstallmentExpense = async (
    userId: string,
    dto: CreateInstallmentExpenseDto,
  ) => {
    const registrationDate = new Date();
    const startMonth = firstDayOfUtcMonth(registrationDate);

    this.validateInstallmentTotal(dto);

    const category = await this.findSubcategory(userId, dto.categoryId);
    const { card, type } = await this.resolvePaymentMethod(userId, dto);

    return this.prisma.$transaction(async (tx) => {
      const installmentExpense = await tx.installmentExpense.create({
        data: {
          userId,
          categoryId: category.id,
          cardId: card?.id ?? null,
          description: dto.description,
          totalAmount: dto.totalAmount,
          installmentAmount: dto.installmentAmount,
          totalInstallments: dto.totalInstallments,
          paymentMethod: dto.paymentMethod,
          startMonth,
          deletedAt: null,
        },
      });

      for (let index = 0; index < dto.totalInstallments; index += 1) {
        const baseDate = addMonths(registrationDate, index);
        const billingDate = this.calculateInstallmentBillingDate(
          baseDate,
          card,
        );
        const periodId =
          index === 0
            ? await this.resolveCurrentInstallmentPeriodId(tx, userId, baseDate)
            : await this.resolveFutureInstallmentPeriodId(
                tx,
                userId,
                baseDate,
              );

        await this.createTransactionService.createTransactionInternal(
          {
            userId,
            categoryId: category.id,
            cardId: card?.id ?? null,
            installmentExpenseId: installmentExpense.id,
            fixedExpenseId: null,
            paid: null,
            periodId,
            type,
            amount: dto.installmentAmount,
            description: `${dto.description} — Parcela ${index + 1}/${dto.totalInstallments}`,
            transactionDate: baseDate,
            billingDate,
          },
          tx,
        );
      }

      return installmentExpense;
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
        'Gasto parcelado deve referenciar uma subcategoria válida.',
      );
    }

    return category;
  };

  private resolvePaymentMethod = async (
    userId: string,
    dto: CreateInstallmentExpenseDto,
  ) => {
    if (dto.paymentMethod === InstallmentPaymentMethod.BOLETO) {
      if (dto.cardId) {
        throw new BadRequestException(
          'Gasto parcelado em boleto não pode ter cartão.',
        );
      }

      return {
        card: null,
        type: TransactionType.DEBIT,
      };
    }

    const card = dto.cardId
      ? await this.findCard(userId, dto.cardId)
      : await this.findDefaultCard(userId);

    return {
      card,
      type: TransactionType.CREDIT,
    };
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

  private findDefaultCard = async (userId: string) => {
    const card = await this.prisma.card.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!card) {
      throw new BadRequestException(
        'Nenhum cartão padrão definido. Defina um cartão padrão ou informe o cardId.',
      );
    }

    return card;
  };

  private validateInstallmentTotal = (dto: CreateInstallmentExpenseDto) => {
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

  private resolveCurrentInstallmentPeriodId = async (
    tx: PrismaTransactionClient,
    userId: string,
    baseDate: Date,
  ) => {
    const period = await tx.salaryPeriod.findFirst({
      where: {
        userId,
        startedAt: {
          lte: baseDate,
        },
        OR: [
          {
            endedAt: {
              gte: baseDate,
            },
          },
          {
            endedAt: null,
          },
        ],
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!period) {
      throw new BadRequestException(
        'Cadastre seu salário antes de registrar transações.',
      );
    }

    return period.id;
  };

  private resolveFutureInstallmentPeriodId = async (
    tx: PrismaTransactionClient,
    userId: string,
    baseDate: Date,
  ) => {
    const period = await tx.salaryPeriod.findFirst({
      where: {
        userId,
        referenceMonth: firstDayOfUtcMonth(baseDate),
      },
    });

    return period?.id ?? null;
  };
}

