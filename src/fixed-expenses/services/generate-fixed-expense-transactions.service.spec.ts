import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { GenerateFixedExpenseTransactionsService } from './generate-fixed-expense-transactions.service';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

describe('GenerateFixedExpenseTransactionsService', () => {
  let prisma: MockPrismaService;
  let generateSingleFixedExpenseTransactionService: {
    generateSingleFixedExpenseTransaction: jest.Mock;
  };
  let service: GenerateFixedExpenseTransactionsService;

  const referenceMonth = new Date('2025-06-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = makePrisma();
    generateSingleFixedExpenseTransactionService = {
      generateSingleFixedExpenseTransaction: jest
        .fn()
        .mockResolvedValue({ id: 'transaction-1' }),
    };
    service = new GenerateFixedExpenseTransactionsService(
      prisma as unknown as PrismaService,
      generateSingleFixedExpenseTransactionService as unknown as GenerateSingleFixedExpenseTransactionService,
    );
  });

  it('deve gerar uma transacão para cada FixedExpense ativo elegivel', async () => {
    const fixedExpenses = [
      {
        id: 'fixed-expense-1',
        userId: 'user-1',
        paymentMethod: TransactionType.PIX,
      },
      {
        id: 'fixed-expense-2',
        userId: 'user-1',
        paymentMethod: TransactionType.CREDIT,
      },
    ];

    prisma.fixedExpense.findMany.mockResolvedValue(fixedExpenses);

    await service.generateFixedExpenseTransactions({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
    });

    expect(prisma.fixedExpense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
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
      orderBy: { createdAt: 'asc' },
    });
    expect(
      generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction,
    ).toHaveBeenCalledTimes(2);
    expect(
      generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction,
    ).toHaveBeenNthCalledWith(
      1,
      {
        userId: 'user-1',
        periodId: 'period-1',
        referenceMonth,
        fixedExpense: fixedExpenses[0],
      },
      prisma,
    );
  });

  it('deve usar filtro que ignora soft-deletados e endMonth anterior ao referenceMonth', async () => {
    prisma.fixedExpense.findMany.mockResolvedValue([]);

    await service.generateFixedExpenseTransactions({
      userId: 'user-1',
      periodId: 'period-1',
      referenceMonth,
    });

    expect(prisma.fixedExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: expect.arrayContaining([
            { endMonth: null },
            { endMonth: { gte: referenceMonth } },
          ]),
        }),
      }),
    );
    expect(
      generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction,
    ).not.toHaveBeenCalled();
  });
});
