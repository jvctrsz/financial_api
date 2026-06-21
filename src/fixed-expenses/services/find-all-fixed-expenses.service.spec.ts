import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllFixedExpensesService } from './find-all-fixed-expenses.service';

describe('FindAllFixedExpensesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllFixedExpensesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllFixedExpensesService(
      prisma as unknown as PrismaService,
    );
  });

  it('deve listar apenas gastos fixos ativos do usuário autenticado', async () => {
    const fixedExpenses = [
      {
        id: 'fixed-expense-1',
        userId: 'user-1',
        deletedAt: null,
      },
    ];
    prisma.fixedExpense.findMany.mockResolvedValue(fixedExpenses);

    await expect(service.findAllFixedExpenses('user-1')).resolves.toBe(
      fixedExpenses,
    );

    expect(prisma.fixedExpense.findMany).toHaveBeenCalledWith({
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
    prisma.fixedExpense.findMany.mockResolvedValue([]);

    await service.findAllFixedExpenses('user-2');

    expect(prisma.fixedExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-2',
        }),
      }),
    );
  });

  it('deve retornar card null quando não houver cartão', async () => {
    const fixedExpense = {
      id: 'fixed-expense-1',
      card: null,
    };
    prisma.fixedExpense.findMany.mockResolvedValue([fixedExpense]);

    await expect(service.findAllFixedExpenses('user-1')).resolves.toEqual([
      fixedExpense,
    ]);
  });
});
