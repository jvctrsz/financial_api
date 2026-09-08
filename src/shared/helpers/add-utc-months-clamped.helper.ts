export const addUtcMonthsClamped = (date: Date, amount: number): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + amount;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, month + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(year, month, day));
};
