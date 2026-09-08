import { firstDayOfUtcMonth } from '../../salaries/utils/date-only.util';

export const INSTALLMENT_TEMPORAL_STATUS = {
  HISTORICAL: 'HISTORICAL',
  CURRENT_BILLING: 'CURRENT_BILLING',
  FUTURE: 'FUTURE',
} as const;

export type InstallmentTemporalStatus =
  (typeof INSTALLMENT_TEMPORAL_STATUS)[keyof typeof INSTALLMENT_TEMPORAL_STATUS];

/** Classifica pela fatura em relação ao mês UTC atual, sem considerar `paid`. */
export const resolveInstallmentTemporalStatus = (
  billingDate: Date,
  currentDate: Date,
): InstallmentTemporalStatus => {
  const billingMonth = firstDayOfUtcMonth(billingDate).getTime();
  const currentMonth = firstDayOfUtcMonth(currentDate).getTime();

  if (billingMonth < currentMonth) {
    return INSTALLMENT_TEMPORAL_STATUS.HISTORICAL;
  }

  if (billingMonth > currentMonth) {
    return INSTALLMENT_TEMPORAL_STATUS.FUTURE;
  }

  return INSTALLMENT_TEMPORAL_STATUS.CURRENT_BILLING;
};
