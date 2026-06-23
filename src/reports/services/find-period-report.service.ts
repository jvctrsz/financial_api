import { NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildAsideExpensePeriodWhere,
  decimalToNumber,
  formatDateOnly,
  formatMonth,
} from './report-utils';

type PeriodReportTransaction = {
  amount: unknown;
  category: {
    name: string;
    parent: {
      name: string;
    } | null;
  };
};

type PeriodWithSalary = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  referenceMonth: Date;
  salary?: {
    amount: unknown;
  } | null;
};

@Injectable()
export class FindPeriodReportService {
  constructor(private readonly prisma: PrismaService) {}

  findPeriodReport = async (userId: string, periodId: string) => {
    const period = (await this.prisma.salaryPeriod.findFirst({
      where: {
        id: periodId,
        userId,
      },
      include: {
        salary: true,
      },
    })) as PeriodWithSalary | null;

    if (!period || !period.salary) {
      throw new NotFoundException('Periodo financeiro nao encontrado.');
    }

    const [transactions, incomes, asideExpenses] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          periodId,
          deletedAt: null,
        },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      }),
      this.prisma.income.aggregate({
        where: {
          userId,
          month: period.referenceMonth,
          includeInBalance: true,
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.asideExpense.aggregate({
        where: buildAsideExpensePeriodWhere(userId, period.referenceMonth),
        _sum: {
          amount: true,
        },
      }),
    ]);

    const salaryAmount = decimalToNumber(period.salary.amount);
    const transactionsTotal = transactions.reduce(
      (total, transaction) => total + decimalToNumber(transaction.amount),
      0,
    );
    const incomesTotal = decimalToNumber(incomes._sum.amount);
    const asideExpensesTotal = decimalToNumber(asideExpenses._sum.amount);

    return {
      period: {
        id: period.id,
        referenceMonth: formatMonth(period.referenceMonth),
        startedAt: formatDateOnly(period.startedAt),
        endedAt: period.endedAt ? formatDateOnly(period.endedAt) : null,
      },
      totals: {
        salary: salaryAmount,
        incomes: incomesTotal,
        transactions: transactionsTotal,
        asideExpenses: asideExpensesTotal,
        available:
          salaryAmount + incomesTotal - transactionsTotal - asideExpensesTotal,
      },
      byCategory: this.buildByCategory(
        transactions as PeriodReportTransaction[],
      ),
    };
  };

  private buildByCategory = (transactions: PeriodReportTransaction[]) => {
    const roots = new Map<
      string,
      {
        category: string;
        total: number;
        children: Map<string, { subcategory: string; total: number }>;
      }
    >();

    for (const transaction of transactions) {
      const rootName =
        transaction.category.parent?.name ?? transaction.category.name;
      const subcategoryName = transaction.category.parent
        ? transaction.category.name
        : transaction.category.name;
      const amount = decimalToNumber(transaction.amount);
      const root = roots.get(rootName) ?? {
        category: rootName,
        total: 0,
        children: new Map<string, { subcategory: string; total: number }>(),
      };
      const child = root.children.get(subcategoryName) ?? {
        subcategory: subcategoryName,
        total: 0,
      };

      root.total += amount;
      child.total += amount;
      root.children.set(subcategoryName, child);
      roots.set(rootName, root);
    }

    return Array.from(roots.values()).map((root) => ({
      category: root.category,
      total: root.total,
      children: Array.from(root.children.values()),
    }));
  };
}
