import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type LinkOrphanTransactionsParams = {
  userId: string;
  periodId: string;
  referenceMonth: Date;
};

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LinkOrphanTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  linkOrphanTransactions = async (
    params: LinkOrphanTransactionsParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { userId, periodId, referenceMonth } = params;

    return prismaClient.transaction.updateMany({
      where: {
        userId,
        type: TransactionType.CREDIT,
        periodId: null,
        billingDate: referenceMonth,
      },
      data: {
        periodId,
      },
    });
  };
}
