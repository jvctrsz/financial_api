import { BadRequestException, Injectable } from '@nestjs/common';
import { Card, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDateOnly } from '../../salaries/utils/date-only.util';
import { calculateCreditBillingDate } from '../../shared/helpers/billing-date.helper';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

export type InternalCreateTransactionParams = {
  userId: string;
  categoryId: string;
  cardId: string | null;
  periodId: string | null;
  installmentExpenseId?: string | null;
  fixedExpenseId?: string | null;
  paid?: boolean | null;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: Date;
  billingDate: Date;
};

@Injectable()
export class CreateTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  createTransaction = async (userId: string, dto: CreateTransactionDto) => {
    const transactionDate = parseDateOnly(dto.transactionDate);
    const category = await this.findSubcategory(userId, dto.categoryId);
    const card = await this.resolveCard(userId, dto);
    const billingDate = this.calculateBillingDate(
      transactionDate,
      dto.type,
      card,
    );
    const period = await this.resolvePeriod(userId, transactionDate);

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: category.id,
        cardId: card?.id ?? null,
        periodId: period.id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        transactionDate,
        billingDate,
      },
    });
  };

  createTransactionInternal = async (
    params: InternalCreateTransactionParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    return prismaClient.transaction.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId,
        cardId: params.cardId,
        installmentExpenseId: params.installmentExpenseId ?? null,
        fixedExpenseId: params.fixedExpenseId ?? null,
        periodId: params.periodId,
        type: params.type,
        amount: params.amount,
        description: params.description,
        transactionDate: params.transactionDate,
        billingDate: params.billingDate,
        paid: params.paid ?? null,
        deletedAt: null,
      },
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
        'Transações devem referenciar uma subcategoria válida.',
      );
    }

    return category;
  };

  private resolveCard = async (userId: string, dto: CreateTransactionDto) => {
    if (dto.type !== TransactionType.CREDIT) {
      if (dto.cardId) {
        throw new BadRequestException(
          'Transações de débito ou PIX não podem ter cartão.',
        );
      }

      return null;
    }

    if (dto.cardId) {
      const card = await this.prisma.card.findFirst({
        where: {
          id: dto.cardId,
          userId,
        },
      });

      if (!card) {
        throw new BadRequestException('Cartão não encontrado.');
      }

      return card;
    }

    const cards = await this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!cards.length) {
      throw new BadRequestException(
        'Nenhum cartão cadastrado. Cadastre um cartão para continuar.',
      );
    }

    const defaultCard = cards.find((card) => card.isDefault);

    if (!defaultCard) {
      throw new BadRequestException(
        'Nenhum cartão padrão definido. Defina um cartão padrão ou informe o cardId.',
      );
    }

    return defaultCard;
  };

  private calculateBillingDate = (
    transactionDate: Date,
    type: TransactionType,
    card: Card | null,
  ) => {
    if (type !== TransactionType.CREDIT) {
      return transactionDate;
    }

    if (!card) {
      throw new BadRequestException('Cartão não encontrado.');
    }

    return calculateCreditBillingDate(transactionDate, card.closingDay);
  };

  private resolvePeriod = async (userId: string, transactionDate: Date) => {
    const period = await this.prisma.salaryPeriod.findFirst({
      where: {
        userId,
        startedAt: {
          lte: transactionDate,
        },
        OR: [
          {
            endedAt: {
              gte: transactionDate,
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

    return period;
  };
}
