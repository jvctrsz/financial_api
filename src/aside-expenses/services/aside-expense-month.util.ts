import { BadRequestException } from '@nestjs/common';
import { isValid, parseISO, startOfMonth } from 'date-fns';
import { parseDateOnly } from '../../salaries/utils/date-only.util';

const invalidMonth = new BadRequestException('Informe um mês válido.');

export const normalizeAsideExpenseMonth = (value: string): Date => {
  const yearMonthMatch = value.match(/^(\d{4})-(\d{2})$/);

  if (yearMonthMatch) {
    const month = Number(yearMonthMatch[2]);

    if (month < 1 || month > 12) {
      throw invalidMonth;
    }

    return parseDateOnly(`${value}-01`);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsedDate = parseISO(value.slice(0, 10));

    if (!isValid(parsedDate)) {
      throw invalidMonth;
    }

    const monthStart = startOfMonth(parsedDate);

    return new Date(
      Date.UTC(monthStart.getFullYear(), monthStart.getMonth(), 1),
    );
  }

  throw invalidMonth;
};
