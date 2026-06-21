import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  firstDayOfUtcMonth,
  todayAsUtcDateOnly,
} from '../../salaries/utils/date-only.util';
import { FinishAsideExpenseDto } from '../dto/finish-aside-expense.dto';
import { normalizeAsideExpenseMonth } from './aside-expense-month.util';

@Injectable()
export class FinishAsideExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  finishAsideExpense = async (
    userId: string,
    asideExpenseId: string,
    dto: FinishAsideExpenseDto,
  ) => {
    const asideExpense = await this.prisma.asideExpense.findFirst({
      where: {
        id: asideExpenseId,
        userId,
        deletedAt: null,
      },
    });

    if (!asideExpense) {
      throw new NotFoundException('Gasto a parte não encontrado.');
    }

    if (!asideExpense.recurrent) {
      throw new BadRequestException(
        'Somente gastos a parte recorrentes podem ser finalizados.',
      );
    }

    const endMonth = dto.endMonth
      ? normalizeAsideExpenseMonth(dto.endMonth)
      : firstDayOfUtcMonth(todayAsUtcDateOnly());

    return this.prisma.asideExpense.update({
      where: { id: asideExpense.id },
      data: { endMonth },
    });
  };
}
