import { BadRequestException } from '@nestjs/common';
import { InstallmentPaymentMethod, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionService } from '../../transactions/services/create-transaction.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateInstallmentExpenseService } from './create-installment-expense.service';

describe('CreateInstallmentExpenseService', () => {
  let prisma: MockPrismaService;
  let createTransactionService: CreateTransactionService;
  let service: CreateInstallmentExpenseService;

  const registrationDate = new Date('2025-07-07T10:30:00.000Z');
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
    isDefault: true,
  };
  const installmentExpense = {
    id: 'installment-expense-1',
    userId: 'user-1',
    categoryId: 'category-1',
    cardId: 'card-1',
    deletedAt: null,
  };
  const period = {
    id: 'period-1',
    userId: 'user-1',
    referenceMonth: new Date('2025-07-01T00:00:00.000Z'),
    startedAt: new Date('2025-07-01T00:00:00.000Z'),
    endedAt: null,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(registrationDate);

    prisma = makePrisma();
    createTransactionService = new CreateTransactionService(
      prisma as unknown as PrismaService,
    );
    service = new CreateInstallmentExpenseService(
      prisma as unknown as PrismaService,
      createTransactionService,
    );

    prisma.category.findFirst.mockResolvedValue(subcategory);
    prisma.card.findFirst.mockResolvedValue(card);
    prisma.installmentExpense.create.mockResolvedValue(installmentExpense);
    prisma.salaryPeriod.findFirst.mockResolvedValue(period);
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: `transaction-${prisma.transaction.create.mock.calls.length}`,
        ...data,
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve criar InstallmentExpense com startMonth derivado do mes de cadastro e gerar exatamente totalInstallments transacoes', async () => {
    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 900,
        installmentAmount: 300,
        totalInstallments: 3,
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
        categoryId: 'category-1',
        cardId: 'card-1',
      }),
    ).resolves.toBe(installmentExpense);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.installmentExpense.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'category-1',
        cardId: 'card-1',
        description: 'Notebook',
        totalAmount: 900,
        installmentAmount: 300,
        totalInstallments: 3,
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
        startMonth: new Date('2025-07-01T00:00:00.000Z'),
        deletedAt: null,
      },
    });
    expect(prisma.transaction.create).toHaveBeenCalledTimes(3);
  });

  it('deve preservar o dia real da registrationDate ao avancar as parcelas', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Curso',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.BOLETO,
      categoryId: 'category-1',
    });

    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: TransactionType.DEBIT,
        cardId: null,
        transactionDate: new Date('2025-07-07T10:30:00.000Z'),
        billingDate: new Date('2025-07-07T10:30:00.000Z'),
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        transactionDate: new Date('2025-08-07T10:30:00.000Z'),
        billingDate: new Date('2025-08-07T10:30:00.000Z'),
      }),
    });
  });

  it('deve gerar descricoes e preencher installmentExpenseId nas parcelas', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Notebook',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        installmentExpenseId: 'installment-expense-1',
        description: 'Notebook — Parcela 1/2',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        installmentExpenseId: 'installment-expense-1',
        description: 'Notebook — Parcela 2/2',
      }),
    });
  });

  it('com cadastro apos fechamento do cartao deve gerar billingDate no mes seguinte', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Notebook',
      totalAmount: 300,
      installmentAmount: 300,
      totalInstallments: 1,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.CREDIT,
        cardId: 'card-1',
        transactionDate: new Date('2025-07-07T10:30:00.000Z'),
        billingDate: new Date('2025-08-01T00:00:00.000Z'),
      }),
    });
  });

  it('paymentMethod CREDIT_CARD com cardId informado deve gerar parcelas CREDIT com o cartao informado', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Notebook',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-1',
      },
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: TransactionType.CREDIT,
        cardId: 'card-1',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        type: TransactionType.CREDIT,
        cardId: 'card-1',
      }),
    });
  });

  it('paymentMethod CREDIT_CARD sem cardId deve resolver o cartao padrao do usuario', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Curso',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
    });

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isDefault: true,
      },
    });
    expect(prisma.installmentExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardId: 'card-1',
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: TransactionType.CREDIT,
        cardId: 'card-1',
      }),
    });
  });

  it('paymentMethod CREDIT_CARD sem cardId e sem cartao padrao deve rejeitar sem criar parcelas', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Curso',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
        categoryId: 'category-1',
      }),
    ).rejects.toThrow(
      'Nenhum cartão padrão definido. Defina um cartão padrão ou informe o cardId.',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.installmentExpense.create).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('paymentMethod BOLETO deve gerar parcelas DEBIT sem cartao e com billingDate igual ao baseDate', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Boleto escola',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.BOLETO,
      categoryId: 'category-1',
    });

    expect(prisma.card.findFirst).not.toHaveBeenCalled();
    expect(prisma.installmentExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardId: null,
        paymentMethod: InstallmentPaymentMethod.BOLETO,
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: TransactionType.DEBIT,
        cardId: null,
        transactionDate: new Date('2025-07-07T10:30:00.000Z'),
        billingDate: new Date('2025-07-07T10:30:00.000Z'),
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        type: TransactionType.DEBIT,
        cardId: null,
        transactionDate: new Date('2025-08-07T10:30:00.000Z'),
        billingDate: new Date('2025-08-07T10:30:00.000Z'),
      }),
    });
  });

  it('paymentMethod BOLETO com cardId informado deve rejeitar sem criar parcelas', async () => {
    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Boleto escola',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.BOLETO,
        categoryId: 'category-1',
        cardId: 'card-1',
      }),
    ).rejects.toThrow('Gasto parcelado em boleto não pode ter cartão.');

    expect(prisma.card.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.installmentExpense.create).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('deve resolver periodId da parcela 0 pelo intervalo do SalaryPeriod usando baseDate como ancora', async () => {
    await service.createInstallmentExpense('user-1', {
      description: 'Notebook',
      totalAmount: 300,
      installmentAmount: 300,
      totalInstallments: 1,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        startedAt: {
          lte: new Date('2025-07-07T10:30:00.000Z'),
        },
        OR: [
          {
            endedAt: {
              gte: new Date('2025-07-07T10:30:00.000Z'),
            },
          },
          {
            endedAt: null,
          },
        ],
      },
      orderBy: { startedAt: 'desc' },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodId: 'period-1',
      }),
    });
  });

  it('deve resolver periodId das parcelas futuras pelo referenceMonth exato do baseDate', async () => {
    const augustPeriod = {
      ...period,
      id: 'period-august',
      referenceMonth: new Date('2025-08-01T00:00:00.000Z'),
    };

    prisma.salaryPeriod.findFirst
      .mockReset()
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(augustPeriod);

    await service.createInstallmentExpense('user-1', {
      description: 'Curso',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'user-1',
        referenceMonth: new Date('2025-08-01T00:00:00.000Z'),
      },
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        transactionDate: new Date('2025-08-07T10:30:00.000Z'),
        periodId: 'period-august',
      }),
    });
  });

  it('deve permitir parcelas futuras orfas quando nao houver SalaryPeriod do mes exato', async () => {
    prisma.salaryPeriod.findFirst
      .mockReset()
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(null);

    await service.createInstallmentExpense('user-1', {
      description: 'Curso',
      totalAmount: 600,
      installmentAmount: 300,
      totalInstallments: 2,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        periodId: 'period-1',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        periodId: null,
      }),
    });
  });

  it('nao deve colocar todas as parcelas futuras no periodo da parcela 0 quando existirem periodos futuros', async () => {
    const augustPeriod = {
      ...period,
      id: 'period-august',
      referenceMonth: new Date('2025-08-01T00:00:00.000Z'),
    };
    const septemberPeriod = {
      ...period,
      id: 'period-september',
      referenceMonth: new Date('2025-09-01T00:00:00.000Z'),
    };

    prisma.salaryPeriod.findFirst
      .mockReset()
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(augustPeriod)
      .mockResolvedValueOnce(septemberPeriod);

    await service.createInstallmentExpense('user-1', {
      description: 'Notebook',
      totalAmount: 900,
      installmentAmount: 300,
      totalInstallments: 3,
      paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
      categoryId: 'category-1',
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        periodId: 'period-1',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        periodId: 'period-august',
      }),
    });
    expect(prisma.transaction.create).toHaveBeenNthCalledWith(3, {
      data: expect.objectContaining({
        periodId: 'period-september',
      }),
    });
  });

  it('deve rejeitar e nao criar parcelas quando nao existir SalaryPeriod vigente', async () => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
        categoryId: 'category-1',
        cardId: 'card-1',
      }),
    ).rejects.toThrow('Cadastre seu salário antes de registrar transações.');

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar categoryId inexistente, raiz, de outro usuario ou soft-deletada', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.BOLETO,
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
    expect(prisma.installmentExpense.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar categoria raiz', async () => {
    prisma.category.findFirst.mockResolvedValue({
      ...subcategory,
      parentId: null,
    });

    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.BOLETO,
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar cardId de outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 300,
        installmentAmount: 300,
        totalInstallments: 1,
        paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
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

  it('deve rejeitar quando installmentAmount vezes totalInstallments diverge de totalAmount', async () => {
    await expect(
      service.createInstallmentExpense('user-1', {
        description: 'Notebook',
        totalAmount: 1000,
        installmentAmount: 300,
        totalInstallments: 3,
        paymentMethod: InstallmentPaymentMethod.BOLETO,
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
