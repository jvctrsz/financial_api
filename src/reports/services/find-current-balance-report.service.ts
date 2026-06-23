import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayAsUtcDateOnly } from '../../salaries/utils/date-only.util';
import {
  buildAsideExpensePeriodWhere,
  decimalToNumber,
  formatDateOnly,
} from './report-utils';

type CurrentPeriodWithSalary = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  referenceMonth: Date;
  salary?: {
    amount: unknown;
  } | null;
};

@Injectable()
export class FindCurrentBalanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentBalance = async (userId: string) => {
    const today = todayAsUtcDateOnly();

    const currentPeriod = (await this.prisma.salaryPeriod.findFirst({
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
      include: {
        salary: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    })) as CurrentPeriodWithSalary | null;

    if (!currentPeriod) {
      throw new BadRequestException(
        'Nenhum período financeiro encontrado. Cadastre um salário antes de consultar o saldo.',
      );
    }

    if (!currentPeriod.salary) {
      throw new BadRequestException(
        'Salário do período financeiro não encontrado.',
      );
    }

    const [transactions, incomes, asideExpenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          periodId: currentPeriod.id,
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.income.aggregate({
        where: {
          userId,
          month: currentPeriod.referenceMonth,
          includeInBalance: true,
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.asideExpense.aggregate({
        where: buildAsideExpensePeriodWhere(
          userId,
          currentPeriod.referenceMonth,
        ),
        _sum: {
          amount: true,
        },
      }),
    ]);

    const salaryAmount = decimalToNumber(currentPeriod.salary.amount);
    const transactionsTotal = decimalToNumber(transactions._sum.amount);
    const incomesTotal = decimalToNumber(incomes._sum.amount);
    const asideExpensesTotal = decimalToNumber(asideExpenses._sum.amount);

    return {
      available:
        salaryAmount + incomesTotal - transactionsTotal - asideExpensesTotal,
      periodId: currentPeriod.id,
      periodStart: formatDateOnly(currentPeriod.startedAt),
      periodEnd: currentPeriod.endedAt
        ? formatDateOnly(currentPeriod.endedAt)
        : null,
    };
  };
}
