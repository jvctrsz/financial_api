import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type UnlinkOrphanTransactionsParams = {
  periodId: string;
};

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class UnlinkOrphanTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  unlinkOrphanTransactions = async (
    params: UnlinkOrphanTransactionsParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { periodId } = params;

    return prismaClient.transaction.updateMany({
      where: {
        periodId,
        type: TransactionType.CREDIT,
      },
      data: {
        periodId: null,
      },
    });
  };
}
