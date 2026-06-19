import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type LinkOrphanInstallmentsParams = {
  userId: string;
  periodId: string;
  referenceMonth: Date;
};

type PrismaTransactionClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LinkOrphanInstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  linkOrphanInstallments = async (
    params: LinkOrphanInstallmentsParams,
    prismaClient: PrismaTransactionClient = this.prisma,
  ) => {
    const { userId, periodId, referenceMonth } = params;

    return prismaClient.transaction.updateMany({
      where: {
        userId,
        fixedExpenseId: {
          not: null,
        },
        periodId: null,
        billingDate: referenceMonth,
      },
      data: {
        periodId,
      },
    });
  };
}
