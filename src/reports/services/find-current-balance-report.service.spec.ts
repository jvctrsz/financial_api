import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindCurrentBalanceReportService } from './find-current-balance-report.service';

describe('FindCurrentBalanceReportService', () => {
  let prisma: MockPrismaService;
  let service: FindCurrentBalanceReportService;

  const today = new Date('2025-05-20T12:00:00.000Z');
  const currentPeriod = {
    id: 'period-1',
    userId: 'user-1',
    startedAt: new Date('2025-05-07T00:00:00.000Z'),
    endedAt: null,
    referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
    salary: {
      amount: 5000,
    },
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(today);
    prisma = makePrisma();
    service = new FindCurrentBalanceReportService(
      prisma as unknown as PrismaService,
    );
    prisma.salaryPeriod.findFirst.mockResolvedValue(currentPeriod);
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.asideExpense.aggregate.mockResolvedValue({ _sum: { amount: null } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve retornar erro se nenhum SalaryPeriod atual existir para o usuário', async () => {
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);

    await expect(service.findCurrentBalance('user-1')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.findCurrentBalance('user-1')).rejects.toThrow(
      'Nenhum período financeiro encontrado. Cadastre um salário antes de consultar o saldo.',
    );
  });

  it('deve buscar o periodo atual usando startedAt <= hoje e endedAt >= hoje OR endedAt = null', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        startedAt: {
          lte: new Date('2025-05-20T00:00:00.000Z'),
        },
        OR: [
          {
            endedAt: {
              gte: new Date('2025-05-20T00:00:00.000Z'),
            },
          },
          {
            endedAt: null,
          },
        ],
      },
      include: {
        salary: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  });

  it('deve usar somente dados do userId autenticado', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.salaryPeriod.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
        }),
      }),
    );
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
        }),
      }),
    );
    expect(prisma.income.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
        }),
      }),
    );
    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
        }),
      }),
    );
  });

  it('deve retornar available = salary.amount quando não houver transações, entradas ou gastos a parte', async () => {
    await expect(service.findCurrentBalance('user-1')).resolves.toEqual({
      available: 5000,
      periodId: 'period-1',
      periodStart: '2025-05-07',
      periodEnd: null,
    });
  });

  it('deve subtrair transações ativas do periodo atual', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 1200 } });

    await expect(service.findCurrentBalance('user-1')).resolves.toEqual(
      expect.objectContaining({
        available: 3800,
      }),
    );
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        periodId: 'period-1',
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });
  });

  it('deve ignorar transações soft-deletadas', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      }),
    );
  });

  it('deve ignorar transações de outro usuário', async () => {
    await service.findCurrentBalance('user-2');

    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-2',
        }),
      }),
    );
  });

  it('deve somar apenas Income.includeInBalance = true', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 400 } });

    await expect(service.findCurrentBalance('user-1')).resolves.toEqual(
      expect.objectContaining({
        available: 5400,
      }),
    );
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

  it('deve ignorar Income.includeInBalance = false', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.income.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          includeInBalance: true,
        }),
      }),
    );
  });

  it('deve ignorar Income.deletedAt != null', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.income.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      }),
    );
  });

  it('deve somar AsideExpense não recorrente apenas quando startMonth = referenceMonth', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              recurrent: false,
              startMonth: new Date('2025-05-01T00:00:00.000Z'),
            },
          ]),
        }),
      }),
    );
  });

  it('deve somar AsideExpense recorrente quando startMonth <= referenceMonth e endMonth = null', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              recurrent: true,
              startMonth: {
                lte: new Date('2025-05-01T00:00:00.000Z'),
              },
              OR: expect.arrayContaining([
                {
                  endMonth: null,
                },
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it('deve somar AsideExpense recorrente quando referenceMonth estiver entre startMonth e endMonth', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              recurrent: true,
              OR: expect.arrayContaining([
                {
                  endMonth: {
                    gte: new Date('2025-05-01T00:00:00.000Z'),
                  },
                },
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it('deve ignorar AsideExpense recorrente encerrado antes do referenceMonth', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              recurrent: true,
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
            }),
          ]),
        }),
      }),
    );
  });

  it('deve ignorar AsideExpense com deletedAt != null', async () => {
    await service.findCurrentBalance('user-1');

    expect(prisma.asideExpense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      }),
    );
  });

  it('deve retornar o formato exato', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 3000 } });
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
    prisma.asideExpense.aggregate.mockResolvedValue({ _sum: { amount: 650 } });

    await expect(service.findCurrentBalance('user-1')).resolves.toEqual({
      available: 1850,
      periodId: 'period-1',
      periodStart: '2025-05-07',
      periodEnd: null,
    });
  });
});
