import { TransactionType } from '@prisma/client';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

describe('GenerateSingleFixedExpenseTransactionService', () => {
  let createTransactionService: {
    createTransactionInternal: jest.Mock;
  };
  let service: GenerateSingleFixedExpenseTransactionService;

  const referenceMonth = new Date('2025-06-01T00:00:00.000Z');

  beforeEach(() => {
    createTransactionService = {
      createTransactionInternal: jest
        .fn()
        .mockResolvedValue({ id: 'transaction-1' }),
    };
    service = new GenerateSingleFixedExpenseTransactionService(
      createTransactionService as never,
    );
  });

  it.each([TransactionType.PIX, TransactionType.DEBIT])(
    'deve gerar com paid false',
    async (paymentMethod) => {
      await service.generateSingleFixedExpenseTransaction({
        userId: 'user-1',
        periodId: 'period-1',
        referenceMonth,
        fixedExpense: {
          id: 'fixed-expense-1',
          userId: 'user-1',
          categoryId: 'category-1',
          cardId: null,
          name: 'Internet',
          amount: 120,
          paymentMethod,
        } as never,
      });

      expect(
        createTransactionService.createTransactionInternal,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          categoryId: 'category-1',
          fixedExpenseId: 'fixed-expense-1',
          periodId: 'period-1',
          paid: false,
          type: paymentMethod,
          transactionDate: referenceMonth,
          billingDate: referenceMonth,
        }),
        undefined,
      );
    },
  );

  it('deve gerar CREDIT com paid null', async () => {
    await service.generateSingleFixedExpenseTransaction({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
      fixedExpense: {
        id: 'fixed-expense-1',
        userId: 'user-1',
        categoryId: 'category-1',
        cardId: 'card-1',
        name: 'Assinatura',
        amount: 90,
        paymentMethod: TransactionType.CREDIT,
      } as never,
    });

    expect(
      createTransactionService.createTransactionInternal,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        fixedExpenseId: 'fixed-expense-1',
        periodId: 'period-1',
        paid: null,
        type: TransactionType.CREDIT,
      }),
      undefined,
    );
  });
});
