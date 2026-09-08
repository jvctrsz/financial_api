import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { addUtcMonthsClamped } from '../../shared/helpers/add-utc-months-clamped.helper';

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
    const nextReferenceMonth = addUtcMonthsClamped(referenceMonth, 1);

    return prismaClient.$executeRaw(Prisma.sql`
      UPDATE "transactions"
      SET "periodId" = ${periodId}::uuid
      WHERE "userId" = ${userId}::uuid
        AND "installmentExpenseId" IS NOT NULL
        AND "periodId" IS NULL
        AND "transactionDate" >= ${referenceMonth}::date
        AND "transactionDate" < ${nextReferenceMonth}::date
    `);
  };
}
