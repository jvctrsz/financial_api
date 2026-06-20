import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type UnlinkOrphanInstallmentsParams = {
  periodId: string;
};

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class UnlinkOrphanInstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  unlinkOrphanInstallments = async (
    params: UnlinkOrphanInstallmentsParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { periodId } = params;

    return prismaClient.transaction.updateMany({
      where: {
        periodId,
        OR: [
          {
            fixedExpenseId: {
              not: null,
            },
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
      data: {
        periodId: null,
      },
    });
  };
}
