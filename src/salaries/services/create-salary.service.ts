import { ConflictException, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaryDto } from '../dto/create-salary.dto';
import { firstDayOfUtcMonth, parseDateOnly } from '../utils/date-only.util';
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
            endedAt: null,
          },
          orderBy: { startedAt: 'desc' },
        });

        if (previousPeriod) {
          await tx.salaryPeriod.update({
            where: { id: previousPeriod.id },
            data: { endedAt: subDays(paidAt, 1) },
          });
        }

        const period = await tx.salaryPeriod.create({
          data: {
            userId,
            salaryId: salary.id,
            startedAt: salary.paidAt,
            endedAt: null,
            referenceMonth: firstDayOfUtcMonth(salary.paidAt),
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
