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

    return prismaClient.$executeRaw(Prisma.sql`
      UPDATE "transactions"
      SET "periodId" = ${periodId}::uuid
      WHERE "userId" = ${userId}::uuid
        AND "installmentExpenseId" IS NOT NULL
        AND "periodId" IS NULL
        AND date_trunc('month', "transactionDate")::date = ${referenceMonth}::date
    `);
  };
}
