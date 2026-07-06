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

    return prismaClient.$executeRaw(Prisma.sql`
      UPDATE "transactions" AS t
      SET "periodId" = NULL
      WHERE t."periodId" = ${periodId}::uuid
        AND (
          (
            t."installmentExpenseId" IS NOT NULL
            AND date_trunc('month', t."transactionDate")::date <> (
              SELECT date_trunc('month', ie."startMonth")::date
              FROM "installment_expenses" AS ie
              WHERE ie.id = t."installmentExpenseId"
            )
          )
          OR t."deletedAt" IS NOT NULL
        )
    `);
  };
}
