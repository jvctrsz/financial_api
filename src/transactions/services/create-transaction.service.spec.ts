import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateTransactionService } from './create-transaction.service';

describe('CreateTransactionService', () => {
  let prisma: MockPrismaService;
  let service: CreateTransactionService;

  const subcategory = {
    id: 'category-1',
    userId: 'user-1',
    parentId: 'root-1',
  };
  const card = {
    id: 'card-1',
    userId: 'user-1',
    closingDay: 6,
    isDefault: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };
  const period = {
    id: 'period-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    prisma = makePrisma();
    service = new CreateTransactionService(prisma as unknown as PrismaService);
    prisma.category.findFirst.mockResolvedValue(subcategory);
    prisma.card.findFirst.mockResolvedValue(card);
    prisma.card.findMany.mockResolvedValue([card]);
    prisma.salaryPeriod.findFirst.mockResolvedValue(period);
    prisma.transaction.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'transaction-1', ...data }),
    );
  });

  it('deve criar transação de crédito usando cardId informado', async () => {
    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-05',
        categoryId: 'category-1',
        type: TransactionType.CREDIT,
        cardId: 'card-1',
      }),
    ).resolves.toMatchObject({
      userId: 'user-1',
      cardId: 'card-1',
      periodId: 'period-1',
      billingDate: new Date('2025-05-01T00:00:00.000Z'),
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'category-1',
        cardId: 'card-1',
        periodId: 'period-1',
        type: TransactionType.CREDIT,
        amount: 25,
        description: 'Mercado',
        transactionDate: new Date('2025-05-05T00:00:00.000Z'),
        billingDate: new Date('2025-05-01T00:00:00.000Z'),
      },
    });
  });

  it('deve usar cartao padrao quando crédito não informa cardId', async () => {
    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-05',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
    });

    expect(prisma.card.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardId: 'card-1',
      }),
    });
  });

  it('deve calcular crédito antes do fechamento para o mês corrente', async () => {
    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-05',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingDate: new Date('2025-05-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve calcular crédito no dia do fechamento para o mês seguinte', async () => {
    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-06',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingDate: new Date('2025-06-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve calcular closingDay 1 compra dia 1 para o mês seguinte', async () => {
    prisma.card.findFirst.mockResolvedValue({ ...card, closingDay: 1 });

    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-01',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingDate: new Date('2025-06-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve calcular closingDay 31 compra dia 31 para o mês seguinte', async () => {
    prisma.card.findFirst.mockResolvedValue({ ...card, closingDay: 31 });

    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-31',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingDate: new Date('2025-06-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve usar transactionDate como billingDate para débito', async () => {
    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-07',
      categoryId: 'category-1',
      type: TransactionType.DEBIT,
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardId: null,
        billingDate: new Date('2025-05-07T00:00:00.000Z'),
      }),
    });
  });

  it('deve buscar periodo por intervalo para crédito usando transactionDate, não billingDate', async () => {
    await service.createTransaction('user-1', {
      amount: 25,
      description: 'Mercado',
      transactionDate: '2025-05-16',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        startedAt: {
          lte: new Date('2025-05-16T00:00:00.000Z'),
        },
        OR: [
          {
            endedAt: {
              gte: new Date('2025-05-16T00:00:00.000Z'),
            },
          },
          {
            endedAt: null,
          },
        ],
      },
      orderBy: { startedAt: 'desc' },
    });
  });

  it('deve debitar crédito após fechamento no periodo vigente da data da compra', async () => {
    await service.createTransaction('user-1', {
      amount: 100,
      description: 'Compra depois do fechamento',
      transactionDate: '2025-06-16',
      categoryId: 'category-1',
      type: TransactionType.CREDIT,
      cardId: 'card-1',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodId: 'period-1',
        billingDate: new Date('2025-07-01T00:00:00.000Z'),
      }),
    });
    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startedAt: {
            lte: new Date('2025-06-16T00:00:00.000Z'),
          },
        }),
      }),
    );
  });

  it.each([
    [TransactionType.CREDIT, 'card-1'],
    [TransactionType.DEBIT, undefined],
    [TransactionType.PIX, undefined],
  ])(
    'deve resolver periodo atual quando %s acontece no dia do pagamento',
    async (type, cardId) => {
      await service.createTransaction('user-1', {
        amount: 25,
        description: 'Pagamento',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type,
        cardId,
      });

      expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          startedAt: {
            lte: new Date('2025-05-07T00:00:00.000Z'),
          },
          OR: [
            {
              endedAt: {
                gte: new Date('2025-05-07T00:00:00.000Z'),
              },
            },
            {
              endedAt: null,
            },
          ],
        },
        orderBy: { startedAt: 'desc' },
      });
    },
  );

  it.each([
    [TransactionType.CREDIT, 'card-1'],
    [TransactionType.DEBIT, undefined],
    [TransactionType.PIX, undefined],
  ])(
    'deve resolver periodo anterior quando %s acontece no dia anterior ao pagamento',
    async (type, cardId) => {
      await service.createTransaction('user-1', {
        amount: 25,
        description: 'Véspera',
        transactionDate: '2025-05-06',
        categoryId: 'category-1',
        type,
        cardId,
      });

      expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          startedAt: {
            lte: new Date('2025-05-06T00:00:00.000Z'),
          },
          OR: [
            {
              endedAt: {
                gte: new Date('2025-05-06T00:00:00.000Z'),
              },
            },
            {
              endedAt: null,
            },
          ],
        },
        orderBy: { startedAt: 'desc' },
      });
    },
  );

  it.each([
    [TransactionType.CREDIT, 'card-1'],
    [TransactionType.DEBIT, undefined],
    [TransactionType.PIX, undefined],
  ])('deve rejeitar %s quando periodo não existir', async (type, cardId) => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type,
        cardId,
      }),
    ).rejects.toThrow('Cadastre seu salário antes de registrar transações.');

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar categoria raiz', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-root',
      userId: 'user-1',
      parentId: null,
    });

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-root',
        type: TransactionType.PIX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar categoria de outro usuario', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createTransaction('user-2', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.PIX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar subcategoria soft-deletada', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.PIX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar cartao de outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.CREDIT,
        cardId: 'card-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar débito com cardId', async () => {
    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.DEBIT,
        cardId: 'card-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar crédito sem cartoes cadastrados com mensagem exata', async () => {
    prisma.card.findMany.mockResolvedValue([]);

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.CREDIT,
      }),
    ).rejects.toThrow(
      'Nenhum cartão cadastrado. Cadastre um cartão para continuar.',
    );
  });

  it('deve rejeitar crédito sem cartao padrao e sem cardId com mensagem exata', async () => {
    prisma.card.findMany.mockResolvedValue([{ ...card, isDefault: false }]);

    await expect(
      service.createTransaction('user-1', {
        amount: 25,
        description: 'Mercado',
        transactionDate: '2025-05-07',
        categoryId: 'category-1',
        type: TransactionType.CREDIT,
      }),
    ).rejects.toThrow(
      'Nenhum cartão padrão definido. Defina um cartão padrão ou informe o cardId.',
    );
  });
});
