import { resolveFixedExpenseOccurrenceDate } from './fixed-expense-occurrence-date.helper';

describe('resolveFixedExpenseOccurrenceDate', () => {
  it('deve usar chargeDay no mes de referencia quando cair no inicio do periodo ou depois', () => {
    expect(
      resolveFixedExpenseOccurrenceDate({
        periodStartedAt: new Date('2026-09-04T00:00:00.000Z'),
        referenceMonth: new Date('2026-09-01T00:00:00.000Z'),
        chargeDay: 7,
      }),
    ).toEqual(new Date('2026-09-07T00:00:00.000Z'));
  });

  it('deve usar a ocorrencia do mes seguinte quando chargeDay cair antes do inicio do periodo', () => {
    expect(
      resolveFixedExpenseOccurrenceDate({
        periodStartedAt: new Date('2026-09-20T00:00:00.000Z'),
        referenceMonth: new Date('2026-09-01T00:00:00.000Z'),
        chargeDay: 7,
      }),
    ).toEqual(new Date('2026-10-07T00:00:00.000Z'));
  });

  it.each([
    ['2026-02-01', '2026-02-04', '2026-02-28'],
    ['2028-02-01', '2028-02-04', '2028-02-29'],
  ])(
    'deve limitar chargeDay 31 ao ultimo dia valido de %s',
    (referenceMonth, periodStartedAt, expected) => {
      expect(
        resolveFixedExpenseOccurrenceDate({
          periodStartedAt: new Date(`${periodStartedAt}T00:00:00.000Z`),
          referenceMonth: new Date(`${referenceMonth}T00:00:00.000Z`),
          chargeDay: 31,
        }),
      ).toEqual(new Date(`${expected}T00:00:00.000Z`));
    },
  );
});
