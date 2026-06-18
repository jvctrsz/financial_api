import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UnlinkOrphanTransactionsService } from '../../transactions/services/unlink-orphan-transactions.service';
import { subUtcDateOnlyDays } from '../utils/date-only.util';

@Injectable()
export class DeleteSalaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unlinkOrphanTransactionsService: UnlinkOrphanTransactionsService,
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

      const blockingTransaction = await tx.transaction.findFirst({
        where: {
          periodId: periodBeingDeleted.id,
          type: {
            in: [TransactionType.DEBIT, TransactionType.PIX],
          },
        },
        select: {
          id: true,
        },
      });

      if (blockingTransaction) {
        throw new BadRequestException(
          'Não e permitido remover salário com transações DEBITO ou PIX vinculadas ao período.',
        );
      }

      await this.unlinkOrphanTransactionsService.unlinkOrphanTransactions(
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
