import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllAsideExpensesService } from './find-all-aside-expenses.service';

describe('FindAllAsideExpensesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllAsideExpensesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllAsideExpensesService(
      prisma as unknown as PrismaService,
    );
  });

  it('deve listar apenas registros do usuário autenticado', async () => {
    const asideExpenses = [{ id: 'aside-expense-1' }];

    prisma.asideExpense.findMany.mockResolvedValue(asideExpenses);

    await expect(service.findAllAsideExpenses('user-1')).resolves.toBe(
      asideExpenses,
    );

    expect(prisma.asideExpense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
      orderBy: [{ startMonth: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('deve filtrar deletedAt null', async () => {
    prisma.asideExpense.findMany.mockResolvedValue([]);

    await service.findAllAsideExpenses('user-1');

    expect(prisma.asideExpense.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
      }),
      orderBy: [{ startMonth: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('deve ordenar por startMonth crescente e createdAt crescente', async () => {
    prisma.asideExpense.findMany.mockResolvedValue([]);

    await service.findAllAsideExpenses('user-1');

    expect(prisma.asideExpense.findMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      orderBy: [{ startMonth: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('não deve retornar registros de outro usuário', async () => {
    prisma.asideExpense.findMany.mockResolvedValue([]);

    await service.findAllAsideExpenses('user-2');

    expect(prisma.asideExpense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-2',
        deletedAt: null,
      },
      orderBy: [{ startMonth: 'asc' }, { createdAt: 'asc' }],
    });
  });
});
