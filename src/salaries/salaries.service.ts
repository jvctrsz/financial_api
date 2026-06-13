import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryDto } from './dto/create-salary.dto';

type PrismaErrorLike = {
  code?: string;
};

@Injectable()
export class SalariesService {
  constructor(private readonly prisma: PrismaService) {}

  create = async (userId: string, dto: CreateSalaryDto) => {
    const paidAt = this.parseDateOnly(dto.paidAt);

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
            referenceMonth: this.firstDayOfUtcMonth(salary.paidAt),
          },
        });

        return { salary, period };
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Já existe um salário cadastrado para este usuário nesta data.',
        );
      }

      throw error;
    }
  };

  findAll = async (userId: string) =>
    this.prisma.salary.findMany({
      where: { userId },
      orderBy: { paidAt: 'desc' },
    });

  findCurrent = async (userId: string) =>
    this.findCurrentByDate(userId, this.todayAsUtcDateOnly());

  findCurrentByDate = async (userId: string, date: Date) => {
    const salary = await this.prisma.salary.findFirst({
      where: {
        userId,
        paidAt: {
          lte: date,
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    if (!salary) {
      throw new NotFoundException(
        'Nenhum salário foi cadastrado. Cadastre um salário antes de continuar.',
      );
    }

    return salary;
  };

  private parseDateOnly = (value: string): Date => {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day));
  };

  private firstDayOfUtcMonth = (date: Date): Date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  private todayAsUtcDateOnly = (): Date => {
    const now = new Date();

    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  };

  private isUniqueConstraintError = (
    error: unknown,
  ): error is PrismaErrorLike =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PrismaErrorLike).code === 'P2002';
}
