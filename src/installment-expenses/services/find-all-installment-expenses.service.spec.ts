import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllInstallmentExpensesService } from './find-all-installment-expenses.service';

describe('FindAllInstallmentExpensesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllInstallmentExpensesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllInstallmentExpensesService(
      prisma as unknown as PrismaService,
    );
  });

  it('deve listar apenas gastos fixos ativos do usuário autenticado', async () => {
    const installmentExpenses = [
      {
        id: 'installment-expense-1',
        userId: 'user-1',
        deletedAt: null,
      },
    ];
    prisma.installmentExpense.findMany.mockResolvedValue(installmentExpenses);

    await expect(service.findAllInstallmentExpenses('user-1')).resolves.toBe(
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
    };
    prisma.installmentExpense.findMany.mockResolvedValue([installmentExpense]);

    await expect(service.findAllInstallmentExpenses('user-1')).resolves.toEqual(
      [installmentExpense],
    );
  });
});
