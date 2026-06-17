import { BadRequestException } from '@nestjs/common';
import {
  firstDayOfUtcMonth,
  parseDateOnly,
} from '../../salaries/utils/date-only.util';

export const normalizeIncomeMonth = (value: string): Date => {
  const yearMonthMatch = value.match(/^(\d{4})-(\d{2})$/);

  if (yearMonthMatch) {
    const month = Number(yearMonthMatch[2]);

    if (month < 1 || month > 12) {
      throw new BadRequestException('Informe um mês válido.');
    }

    return parseDateOnly(`${value}-01`);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return firstDayOfUtcMonth(parseDateOnly(value.slice(0, 10)));
  }

  throw new BadRequestException('Informe um mês válido.');
};
