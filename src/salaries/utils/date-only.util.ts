export const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

export const firstDayOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const subUtcDateOnlyDays = (date: Date, days: number): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - days),
  );

export const todayAsUtcDateOnly = (): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};
