import { TransactionType } from '@prisma/client';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

describe('GenerateSingleFixedExpenseTransactionService', () => {
  let prisma: MockPrismaService;
  let createTransactionService: {
    createTransactionInternal: jest.Mock;
  };
  let service: GenerateSingleFixedExpenseTransactionService;

  const referenceMonth = new Date('2025-06-01T00:00:00.000Z');
  const paidAt = new Date('2025-06-07T00:00:00.000Z');

  beforeEach(() => {
    prisma = makePrisma();
    createTransactionService = {
      createTransactionInternal: jest
        .fn()
        .mockResolvedValue({ id: 'transaction-1' }),
    };
    service = new GenerateSingleFixedExpenseTransactionService(
      prisma as never,
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
        paidAt,
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
          transactionDate: paidAt,
          billingDate: paidAt,
        }),
        prisma,
      );
    },
  );

  it('deve gerar CREDIT com paid null', async () => {
    prisma.card.findFirst.mockResolvedValue({
      id: 'card-1',
      userId: 'user-1',
      closingDay: 10,
    });

    await service.generateSingleFixedExpenseTransaction({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
      paidAt,
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
      prisma,
    );
  });

  it('deve gerar CREDIT com billingDate no mes corrente quando paidAt for antes do fechamento', async () => {
    prisma.card.findFirst.mockResolvedValue({
      id: 'card-1',
      userId: 'user-1',
      closingDay: 10,
    });

    await service.generateSingleFixedExpenseTransaction({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
      paidAt: new Date('2025-06-07T00:00:00.000Z'),
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

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-1',
      },
    });
    expect(
      createTransactionService.createTransactionInternal,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionDate: new Date('2025-06-07T00:00:00.000Z'),
        billingDate: new Date('2025-06-01T00:00:00.000Z'),
      }),
      prisma,
    );
  });

  it('deve gerar CREDIT com billingDate no mes seguinte quando paidAt for no fechamento ou depois', async () => {
    prisma.card.findFirst.mockResolvedValue({
      id: 'card-1',
      userId: 'user-1',
      closingDay: 6,
    });

    await service.generateSingleFixedExpenseTransaction({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
      paidAt: new Date('2025-06-07T00:00:00.000Z'),
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
        transactionDate: new Date('2025-06-07T00:00:00.000Z'),
        billingDate: new Date('2025-07-01T00:00:00.000Z'),
      }),
      prisma,
    );
  });
});
