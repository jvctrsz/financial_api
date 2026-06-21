import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateFixedExpenseService } from './create-fixed-expense.service';

describe('CreateFixedExpenseService', () => {
  let prisma: MockPrismaService;
  let createTransactionService: CreateTransactionService;
  let service: CreateFixedExpenseService;

  const subcategory = {
    id: 'category-1',
    userId: 'user-1',
    parentId: 'root-1',
    deletedAt: null,
  };
  const card = {
    id: 'card-1',
    userId: 'user-1',
    closingDay: 6,
  };
  const fixedExpense = {
    id: 'fixed-expense-1',
    userId: 'user-1',
    categoryId: 'category-1',
    cardId: 'card-1',
    deletedAt: null,
  };
  const period = {
    id: 'period-1',
    userId: 'user-1',
    referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = makePrisma();
    createTransactionService = new CreateTransactionService(
      prisma as unknown as PrismaService,
    );
    service = new CreateFixedExpenseService(
      prisma as unknown as PrismaService,
      createTransactionService,
    );

    prisma.category.findFirst.mockResolvedValue(subcategory);
    prisma.card.findFirst.mockResolvedValue(card);
    prisma.fixedExpense.create.mockResolvedValue(fixedExpense);
    prisma.salaryPeriod.findFirst.mockResolvedValue(period);
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: `transaction-${prisma.transaction.create.mock.calls.length}`,
        ...data,
      }),
    );
  });

  it('deve criar FixedExpense com deletedAt null e gerar exatamente totalInstallments transações', async () => {
    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 900,
        installmentAmount: 300,
        totalInstallments: 3,
        startMonth: '2025-06-01',
        categoryId: 'category-1',
        cardId: 'card-1',
      }),
    ).resolves.toBe(fixedExpense);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.fixedExpense.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'category-1',
        cardId: 'card-1',
        description: 'Notebook',
        totalAmount: 900,
        installmentAmount: 300,
        totalInstallments: 3,
        startMonth: new Date('2025-06-01T00:00:00.000Z'),
        deletedAt: null,
      },
    });
    expect(prisma.transaction.create).toHaveBeenCalledTimes(3);
  });

  it('deve gerar descricoes e preencher fixedExpenseId nas parcelas', async () => {
    await service.createFixedExpense('user-1', {
      description: 'Notebook',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        fixedExpenseId: 'fixed-expense-1',
        description: 'Notebook — Parcela 1/2',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        fixedExpenseId: 'fixed-expense-1',
        description: 'Notebook — Parcela 2/2',
      }),
    });
  });

  it('com cardId deve gerar transações CREDIT e calcular billingDate usando closingDay', async () => {
    prisma.card.findFirst.mockResolvedValue({ ...card, closingDay: 1 });

    await service.createFixedExpense('user-1', {
      description: 'Notebook',
      totalAmount: 300,
      installmentAmount: 300,
      totalInstallments: 1,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.CREDIT,
        cardId: 'card-1',
        billingDate: new Date('2025-07-01T00:00:00.000Z'),
      }),
    });
  });

  it('sem cardId deve gerar transações DEBIT com cardId null e billingDate igual ao baseDate', async () => {
    await service.createFixedExpense('user-1', {
      description: 'Curso',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
    });

    expect(prisma.card.findFirst).not.toHaveBeenCalled();
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: TransactionType.DEBIT,
        cardId: null,
        transactionDate: new Date('2025-06-01T00:00:00.000Z'),
        billingDate: new Date('2025-06-01T00:00:00.000Z'),
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        transactionDate: new Date('2025-07-01T00:00:00.000Z'),
        billingDate: new Date('2025-07-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve preencher periodId quando existir SalaryPeriod para o billingDate', async () => {
    await service.createFixedExpense('user-1', {
      description: 'Notebook',
      totalAmount: 300,
      installmentAmount: 300,
      totalInstallments: 1,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodId: 'period-1',
      }),
    });
  });

  it('deve criar parcela com periodId null quando não existir SalaryPeriod', async () => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await service.createFixedExpense('user-1', {
      description: 'Notebook',
      totalAmount: 300,
      installmentAmount: 300,
      totalInstallments: 1,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodId: null,
      }),
    });
  });

  it('deve rejeitar categoryId inexistente, raiz, de outro usuario ou soft-deletada', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        startMonth: '2025-06-01',
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(prisma.fixedExpense.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar categoria raiz', async () => {
    prisma.category.findFirst.mockResolvedValue({
      ...subcategory,
      parentId: null,
    });

    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        startMonth: '2025-06-01',
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar cardId de outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        startMonth: '2025-06-01',
        categoryId: 'category-1',
        cardId: 'card-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-2',
        userId: 'user-1',
      },
    });
  });

  it('deve rejeitar startMonth que não seja primeiro dia do mes', async () => {
    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        startMonth: '2025-06-02',
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar quando installmentAmount vezes totalInstallments diverge de totalAmount', async () => {
    await expect(
      service.createFixedExpense('user-1', {
        description: 'Notebook',
        totalAmount: 1000,
        installmentAmount: 300,
        totalInstallments: 3,
        startMonth: '2025-06-01',
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
