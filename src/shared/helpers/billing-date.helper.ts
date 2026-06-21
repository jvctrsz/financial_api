import { firstDayOfUtcMonth } from '../../salaries/utils/date-only.util';

export const calculateCreditBillingDate = (
  transactionDate: Date,
  closingDay: number,
): Date => {
  if (transactionDate.getUTCDate() < closingDay) {
    return firstDayOfUtcMonth(transactionDate);
  }

  return new Date(
    Date.UTC(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth() + 1,
      1,
    ),
  );
};
