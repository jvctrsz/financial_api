import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateFixedExpenseService } from './create-fixed-expense.service';
import { GenerateSingleFixedExpenseTransactionService } from './generate-single-fixed-expense-transaction.service';

describe('CreateFixedExpenseService', () => {
  let prisma: MockPrismaService;
  let generateSingleFixedExpenseTransactionService: {
    generateSingleFixedExpenseTransaction: jest.Mock;
  };
  let service: CreateFixedExpenseService;

  const subcategory = {
    id: 'category-1',
    userId: 'user-1',
    parentId: 'root-1',
    deletedAt: null,
  };
  const fixedExpense = {
    id: 'fixed-expense-1',
    userId: 'user-1',
    categoryId: 'category-1',
    cardId: null,
    name: 'Internet',
    amount: 120,
    paymentMethod: TransactionType.PIX,
    deletedAt: null,
  };
  const period = {
    id: 'period-1',
    userId: 'user-1',
    referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = makePrisma();
    generateSingleFixedExpenseTransactionService = {
      generateSingleFixedExpenseTransaction: jest
        .fn()
        .mockResolvedValue({ id: 'transaction-1' }),
    };
    service = new CreateFixedExpenseService(
      prisma as unknown as PrismaService,
      generateSingleFixedExpenseTransactionService as unknown as GenerateSingleFixedExpenseTransactionService,
    );

    prisma.category.findFirst.mockResolvedValue(subcategory);
    prisma.fixedExpense.create.mockResolvedValue(fixedExpense);
    prisma.salaryPeriod.findFirst.mockResolvedValue(period);
  });

  it('deve criar FixedExpense e gerar transação do periodo atual quando startInCurrentPeriod for omitido', async () => {
    await expect(
      service.createFixedExpense('user-1', {
        name: 'Internet',
        amount: 120,
        categoryId: 'category-1',
        paymentMethod: TransactionType.PIX,
      }),
    ).resolves.toBe(fixedExpense);

    expect(prisma.fixedExpense.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'category-1',
        cardId: null,
        name: 'Internet',
        amount: 120,
        paymentMethod: TransactionType.PIX,
        endMonth: null,
        deletedAt: null,
      },
    });
    expect(
      generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction,
    ).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        periodId: 'period-1',
        referenceMonth: period.referenceMonth,
        fixedExpense,
      },
      prisma,
    );
  });

  it('deve nao gerar transação quando startInCurrentPeriod for false', async () => {
    await service.createFixedExpense('user-1', {
      name: 'Internet',
      amount: 120,
      categoryId: 'category-1',
      paymentMethod: TransactionType.PIX,
      startInCurrentPeriod: false,
    });

    expect(prisma.salaryPeriod.findFirst).not.toHaveBeenCalled();
    expect(
      generateSingleFixedExpenseTransactionService.generateSingleFixedExpenseTransaction,
    ).not.toHaveBeenCalled();
  });

  it('deve rejeitar startInCurrentPeriod true sem SalaryPeriod', async () => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await expect(
      service.createFixedExpense('user-1', {
        name: 'Internet',
        amount: 120,
        categoryId: 'category-1',
        paymentMethod: TransactionType.PIX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve usar cartão padrão para CREDIT sem cardId', async () => {
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'card-1',
        userId: 'user-1',
        isDefault: true,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);

    await service.createFixedExpense('user-1', {
      name: 'Assinatura',
      amount: 90,
      categoryId: 'category-1',
      paymentMethod: TransactionType.CREDIT,
      startInCurrentPeriod: false,
    });

    expect(prisma.fixedExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardId: 'card-1',
        paymentMethod: TransactionType.CREDIT,
      }),
    });
  });

  it('deve rejeitar categoria raiz, inexistente, de outro usuario ou soft-deletada', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createFixedExpense('user-1', {
        name: 'Internet',
        amount: 120,
        categoryId: 'category-1',
        paymentMethod: TransactionType.PIX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.fixedExpense.create).not.toHaveBeenCalled();
  });
});
