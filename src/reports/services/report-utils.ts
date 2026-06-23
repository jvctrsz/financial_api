export const decimalToNumber = (value: unknown): number => Number(value ?? 0);

export const formatDateOnly = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const formatMonth = (date: Date): string =>
  date.toISOString().slice(0, 7);

export const buildAsideExpensePeriodWhere = (
  userId: string,
  referenceMonth: Date,
) => ({
  userId,
  deletedAt: null,
  OR: [
    {
      recurrent: false,
      startMonth: referenceMonth,
    },
    {
      recurrent: true,
      startMonth: {
        lte: referenceMonth,
      },
      OR: [
        {
          endMonth: null,
        },
        {
          endMonth: {
            gte: referenceMonth,
          },
        },
      ],
    },
  ],
});
