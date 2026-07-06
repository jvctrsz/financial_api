import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UnlinkOrphanInstallmentsService } from '../../transactions/services/unlink-orphan-installments.service';
import { subUtcDateOnlyDays } from '../utils/date-only.util';

type BlockingTransaction = {
  id: string;
};

@Injectable()
export class DeleteSalaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unlinkOrphanInstallmentsService: UnlinkOrphanInstallmentsService,
  ) {}

  deleteSalary = async (userId: string, salaryId: string) =>
    this.prisma.$transaction(async (tx) => {
      const salaryBeingDeleted = await tx.salary.findFirst({
        where: {
          id: salaryId,
          userId,
        },
      });

      if (!salaryBeingDeleted) {
        throw new NotFoundException('Salário não encontrado.');
      }

      const periodBeingDeleted = await tx.salaryPeriod.findFirst({
        where: {
          userId,
          salaryId: salaryBeingDeleted.id,
        },
      });

      if (!periodBeingDeleted) {
        throw new NotFoundException('Período financeiro não encontrado.');
      }

      if (periodBeingDeleted.endedAt !== null) {
        throw new BadRequestException(
          'Somente o salário mais recente pode ser removido.',
        );
      }

      const [blockingTransaction] = await tx.$queryRaw<BlockingTransaction[]>(
        Prisma.sql`
          SELECT t.id
          FROM "transactions" AS t
          LEFT JOIN "installment_expenses" AS ie
            ON ie.id = t."installmentExpenseId"
          WHERE t."periodId" = ${periodBeingDeleted.id}::uuid
            AND t."deletedAt" IS NULL
            AND t."type" IN (
              ${TransactionType.CREDIT}::"TransactionType",
              ${TransactionType.DEBIT}::"TransactionType",
              ${TransactionType.PIX}::"TransactionType"
            )
            AND (
              t."installmentExpenseId" IS NULL
              OR date_trunc('month', t."transactionDate")::date = date_trunc('month', ie."startMonth")::date
            )
          LIMIT 1
        `,
      );

      if (blockingTransaction) {
        throw new BadRequestException(
          'Não é permitido remover salário com transações CREDIT, DEBITO ou PIX vinculadas ao período.',
        );
      }

      await this.unlinkOrphanInstallmentsService.unlinkOrphanInstallments(
        {
          periodId: periodBeingDeleted.id,
        },
        tx,
      );

      await tx.salaryPeriod.delete({
        where: { id: periodBeingDeleted.id },
      });

      const deletedSalary = await tx.salary.delete({
        where: { id: salaryBeingDeleted.id },
      });

      const periodToReopenEndedAt = subUtcDateOnlyDays(
        salaryBeingDeleted.paidAt,
        1,
      );

      const periodToReopen = await tx.salaryPeriod.findFirst({
        where: {
          userId,
          endedAt: periodToReopenEndedAt,
        },
      });

      if (periodToReopen) {
        await tx.salaryPeriod.update({
          where: { id: periodToReopen.id },
          data: { endedAt: null },
        });
      }

      return deletedSalary;
    });
}
