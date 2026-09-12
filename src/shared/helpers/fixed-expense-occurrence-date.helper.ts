import { addUtcMonthsClamped } from './add-utc-months-clamped.helper';

type ResolveFixedExpenseOccurrenceDateParams = {
  periodStartedAt: Date;
  referenceMonth: Date;
  chargeDay: number;
};

const dateAtChargeDay = (referenceMonth: Date, chargeDay: number): Date => {
  const year = referenceMonth.getUTCFullYear();
  const month = referenceMonth.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(chargeDay, lastDayOfMonth)));
};

export const resolveFixedExpenseOccurrenceDate = ({
  periodStartedAt,
  referenceMonth,
  chargeDay,
}: ResolveFixedExpenseOccurrenceDateParams): Date => {
  const occurrenceInReferenceMonth = dateAtChargeDay(referenceMonth, chargeDay);

  if (occurrenceInReferenceMonth >= periodStartedAt) {
    return occurrenceInReferenceMonth;
  }

  return dateAtChargeDay(addUtcMonthsClamped(referenceMonth, 1), chargeDay);
};
