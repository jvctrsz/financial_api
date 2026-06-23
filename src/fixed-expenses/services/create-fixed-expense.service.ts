import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseDateOnly,
  todayAsUtcDateOnly,
} from '../../salaries/utils/date-only.util';
import { CreateFixedExpenseDto } from '../dto/create-fixed-expense.dto';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

@Injectable()
export class CreateFixedExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateSingleFixedExpenseTransactionService: GenerateSingleFixedExpenseTransactionService,
  ) {}

  createFixedExpense = async (
    userId: string,
    dto: CreateFixedExpenseDto,
  ) => {
    const endMonth = dto.endMonth ? parseDateOnly(dto.endMonth) : null;

    if (endMonth) {
      this.validateMonthStart(endMonth);
    }

    const category = await this.findSubcategory(userId, dto.categoryId);
    const cardId = await this.resolveCardId(userId, dto);

    return this.prisma.$transaction(async (tx) => {
      const fixedExpense = await tx.fixedExpense.create({
        data: {
          userId,
          categoryId: category.id,
          cardId,
          name: dto.name,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          endMonth,
          deletedAt: null,
        },
      });

      if (dto.startInCurrentPeriod !== false) {
        const today = todayAsUtcDateOnly();
        const period = await tx.salaryPeriod.findFirst({
          where: {
            userId,
            startedAt: {
              lte: today,
            },
            OR: [
              {
                endedAt: {
                  gte: today,
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
            'Cadastre seu salário antes de criar um gasto fixo recorrente.',
          );
        }

        await this.generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction(
          {
            userId,
            periodId: period.id,
            referenceMonth: period.referenceMonth,
            fixedExpense,
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

  private resolveCardId = async (
    userId: string,
    dto: CreateFixedExpenseDto,
  ) => {
    if (dto.paymentMethod !== TransactionType.CREDIT) {
      if (dto.cardId) {
        throw new BadRequestException(
          'Gastos fixos de débito ou PIX não podem ter cartão.',
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

      return card.id;
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

    return defaultCard.id;
  };

  private validateMonthStart = (month: Date) => {
    if (month.getUTCDate() !== 1) {
      throw new BadRequestException(
        'endMonth deve representar o primeiro dia do mês.',
      );
    }
  };
}
