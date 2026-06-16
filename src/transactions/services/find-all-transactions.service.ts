import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDateOnly } from '../../salaries/utils/date-only.util';
import { FindAllTransactionsQueryDto } from '../dto/find-all-transactions-query.dto';

@Injectable()
export class FindAllTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllTransactions = async (
    userId: string,
    query: FindAllTransactionsQueryDto,
  ) => {
    if (!query.periodId && !query.billingMonth) {
      throw new BadRequestException(
        'Informe periodId ou billingMonth para listar transações.',
      );
    }

    if (query.periodId && query.billingMonth) {
      throw new BadRequestException(
        'Informe apenas um filtro: periodId ou billingMonth.',
      );
    }

    if (query.periodId) {
      return this.prisma.transaction.findMany({
        where: {
          userId,
          periodId: query.periodId,
          deletedAt: null,
        },
        orderBy: { transactionDate: 'desc' },
      });
    }

    const billingMonthStart = parseDateOnly(`${query.billingMonth}-01`);
    const nextBillingMonthStart = new Date(
      Date.UTC(
        billingMonthStart.getUTCFullYear(),
        billingMonthStart.getUTCMonth() + 1,
        1,
      ),
    );

    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        billingDate: {
          gte: billingMonthStart,
          lt: nextBillingMonthStart,
        },
      },
      orderBy: { billingDate: 'desc' },
    });
  };
}
