import { PrismaService } from '../../prisma/prisma.service';
import { INSTALLMENT_TEMPORAL_STATUS } from '../../shared/helpers/installment-temporal-status.helper';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllInstallmentExpensesService } from './find-all-installment-expenses.service';

describe('FindAllInstallmentExpensesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllInstallmentExpensesService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T15:00:00.000Z'));
    prisma = makePrisma();
    service = new FindAllInstallmentExpensesService(
      prisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve listar apenas gastos fixos ativos do usuário autenticado', async () => {
    const installmentExpenses = [
      {
        id: 'installment-expense-1',
        userId: 'user-1',
        deletedAt: null,
        transactions: [],
      },
    ];
    prisma.installmentExpense.findMany.mockResolvedValue(installmentExpenses);

    await expect(service.findAllInstallmentExpenses('user-1')).resolves.toEqual(
      installmentExpenses,
    );

    expect(prisma.installmentExpense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        card: {
          select: {
            id: true,
            name: true,
          },
        },
        transactions: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            transactionDate: true,
            billingDate: true,
            periodId: true,
            deletedAt: true,
            type: true,
          },
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
      orderBy: [{ startMonth: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('não deve retornar gastos fixos de outro usuário', async () => {
    prisma.installmentExpense.findMany.mockResolvedValue([]);

    await service.findAllInstallmentExpenses('user-2');

    expect(prisma.installmentExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-2',
        }),
      }),
    );
  });

  it('deve retornar card null quando não houver cartão', async () => {
    const installmentExpense = {
      id: 'installment-expense-1',
      card: null,
      transactions: [],
    };
    prisma.installmentExpense.findMany.mockResolvedValue([installmentExpense]);

    await expect(service.findAllInstallmentExpenses('user-1')).resolves.toEqual(
      [installmentExpense],
    );
  });

  it('deve retornar parcelas ordenadas com os campos do contrato e status temporal por billingDate', async () => {
    prisma.installmentExpense.findMany.mockResolvedValue([
      {
        id: 'installment-expense-1',
        transactions: [
          {
            id: 'transaction-1',
            installmentNumber: 1,
            amount: 300,
            transactionDate: new Date('2026-04-20T00:00:00.000Z'),
            billingDate: new Date('2026-05-01T00:00:00.000Z'),
            periodId: 'period-april',
            deletedAt: null,
            type: 'CREDIT',
          },
          {
            id: 'transaction-2',
            installmentNumber: 2,
            amount: 300,
            transactionDate: new Date('2026-08-20T00:00:00.000Z'),
            billingDate: new Date('2026-09-01T00:00:00.000Z'),
            periodId: null,
            deletedAt: new Date('2026-09-08T15:00:00.000Z'),
            type: 'CREDIT',
          },
          {
            id: 'transaction-3',
            installmentNumber: 3,
            amount: 300,
            transactionDate: new Date('2026-09-20T00:00:00.000Z'),
            billingDate: new Date('2026-10-01T00:00:00.000Z'),
            periodId: null,
            deletedAt: null,
            type: 'CREDIT',
          },
        ],
      },
    ]);

    await expect(service.findAllInstallmentExpenses('user-1')).resolves.toEqual(
      [
        {
          id: 'installment-expense-1',
          transactions: [
            expect.objectContaining({
              id: 'transaction-1',
              installmentNumber: 1,
              amount: 300,
              transactionDate: new Date('2026-04-20T00:00:00.000Z'),
              billingDate: new Date('2026-05-01T00:00:00.000Z'),
              periodId: 'period-april',
              deletedAt: null,
              type: 'CREDIT',
              temporalStatus: INSTALLMENT_TEMPORAL_STATUS.HISTORICAL,
            }),
            expect.objectContaining({
              id: 'transaction-2',
              installmentNumber: 2,
              deletedAt: new Date('2026-09-08T15:00:00.000Z'),
              temporalStatus: INSTALLMENT_TEMPORAL_STATUS.CURRENT_BILLING,
            }),
            expect.objectContaining({
              id: 'transaction-3',
              installmentNumber: 3,
              temporalStatus: INSTALLMENT_TEMPORAL_STATUS.FUTURE,
            }),
          ],
        },
      ],
    );
  });

  it('nao deve usar paid para classificar a posicao temporal da parcela', async () => {
    prisma.installmentExpense.findMany.mockResolvedValue([
      {
        id: 'installment-expense-1',
        transactions: [
          {
            id: 'transaction-1',
            billingDate: new Date('2026-09-01T00:00:00.000Z'),
            paid: true,
          },
        ],
      },
    ]);

    const [result] = await service.findAllInstallmentExpenses('user-1');

    expect(result.transactions[0].temporalStatus).toBe(
      INSTALLMENT_TEMPORAL_STATUS.CURRENT_BILLING,
    );
  });
});
