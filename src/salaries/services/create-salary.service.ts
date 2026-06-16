import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaryDto } from '../dto/create-salary.dto';
import {
  firstDayOfUtcMonth,
  parseDateOnly,
  subUtcDateOnlyDays,
} from '../utils/date-only.util';
import { isUniqueConstraintError } from '../utils/prisma-error.util';

@Injectable()
export class CreateSalaryService {
  constructor(private readonly prisma: PrismaService) {}

  createSalary = async (userId: string, dto: CreateSalaryDto) => {
    const paidAt = parseDateOnly(dto.paidAt);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const salary = await tx.salary.create({
          data: {
            userId,
            amount: dto.amount,
            paidAt,
          },
        });

        const previousPeriod = await tx.salaryPeriod.findFirst({
          where: {
            userId,
            startedAt: {
              lt: paidAt,
            },
          },
          orderBy: { startedAt: 'desc' },
        });

        const nextPeriod = await tx.salaryPeriod.findFirst({
          where: {
            userId,
            startedAt: {
              gt: paidAt,
            },
          },
          orderBy: { startedAt: 'asc' },
        });

        if (previousPeriod) {
          await tx.salaryPeriod.update({
            where: { id: previousPeriod.id },
            data: { endedAt: subUtcDateOnlyDays(paidAt, 1) },
          });
        }

        const period = await tx.salaryPeriod.create({
          data: {
            userId,
            salaryId: salary.id,
            startedAt: salary.paidAt,
            endedAt: nextPeriod
              ? subUtcDateOnlyDays(nextPeriod.startedAt, 1)
              : null,
            referenceMonth: firstDayOfUtcMonth(salary.paidAt),
          },
        });

        await tx.transaction.updateMany({
          where: {
            userId,
            type: 'CREDIT',
            periodId: null,
            billingDate: period.referenceMonth,
          },
          data: {
            periodId: period.id,
          },
        });

        return { salary, period };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Já existe um salário cadastrado para este usuário nesta data.',
        );
      }

      throw error;
    }
  };
}
