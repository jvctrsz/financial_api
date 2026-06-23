import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindPeriodReportService } from './find-period-report.service';

describe('FindPeriodReportService', () => {
  let prisma: MockPrismaService;
  let service: FindPeriodReportService;

  const period = {
    id: 'period-1',
    startedAt: new Date('2025-05-07T00:00:00.000Z'),
    endedAt: new Date('2025-06-05T00:00:00.000Z'),
    referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
    salary: {
      amount: 5000,
    },
  };

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindPeriodReportService(prisma as unknown as PrismaService);
    prisma.salaryPeriod.findFirst.mockResolvedValue(period);
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.asideExpense.aggregate.mockResolvedValue({ _sum: { amount: null } });
  });

  it('deve calcular saldo do periodo corretamente', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        amount: 1200,
        category: {
          name: 'Mercado',
          parent: { name: 'Alimentacao' },
        },
      },
    ]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 400 } });
    prisma.asideExpense.aggregate.mockResolvedValue({ _sum: { amount: 150 } });

    await expect(
      service.findPeriodReport('user-1', 'period-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        period: {
          id: 'period-1',
          referenceMonth: '2025-05',
          startedAt: '2025-05-07',
          endedAt: '2025-06-05',
        },
        totals: {
          salary: 5000,
          incomes: 400,
          transactions: 1200,
          asideExpenses: 150,
          available: 4050,
        },
      }),
    );
  });

  it('deve buscar periodo por id e userId autenticado', async () => {
    await service.findPeriodReport('user-1', 'period-1');

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'period-1',
        userId: 'user-1',
      },
      include: {
        salary: true,
      },
    });
  });

  it('deve somar apenas incomes elegiveis e ativos do referenceMonth', async () => {
    await service.findPeriodReport('user-1', 'period-1');

    expect(prisma.income.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        month: new Date('2025-05-01T00:00:00.000Z'),
        includeInBalance: true,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });
  });

  it('deve ignorar transações soft-deletadas e de outro usuário', async () => {
    await service.findPeriodReport('user-1', 'period-1');

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        periodId: 'period-1',
        deletedAt: null,
      },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  });

  it('deve aplicar regra de AsideExpense recorrente e não recorrente', async () => {
    await service.findPeriodReport('user-1', 'period-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
        OR: [
          {
            recurrent: false,
            startMonth: new Date('2025-05-01T00:00:00.000Z'),
          },
          {
            recurrent: true,
            startMonth: {
              lte: new Date('2025-05-01T00:00:00.000Z'),
            },
            OR: [
              {
                endMonth: null,
              },
              {
                endMonth: {
                  gte: new Date('2025-05-01T00:00:00.000Z'),
                },
              },
            ],
          },
        ],
      },
      _sum: {
        amount: true,
      },
    });
  });

  it('deve agrupar transações por categoria raiz e subcategoria', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        amount: 600,
        category: {
          name: 'Mercado',
          parent: { name: 'Alimentacao' },
        },
      },
      {
        amount: 250,
        category: {
          name: 'Lanches',
          parent: { name: 'Alimentacao' },
        },
      },
    ]);

    await expect(
      service.findPeriodReport('user-1', 'period-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        byCategory: [
          {
            category: 'Alimentacao',
            total: 850,
            children: [
              { subcategory: 'Mercado', total: 600 },
              { subcategory: 'Lanches', total: 250 },
            ],
          },
        ],
      }),
    );
  });

  it('deve retornar erro se periodo não existir ou for de outro usuário', async () => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await expect(
      service.findPeriodReport('user-1', 'period-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve retornar saldo correto para periodo sem nenhuma transação', async () => {
    prisma.asideExpense.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

    await expect(
      service.findPeriodReport('user-1', 'period-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          available: 4800,
        }),
        byCategory: [],
      }),
    );
  });
});
