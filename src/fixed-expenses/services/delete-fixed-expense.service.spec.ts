import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteFixedExpenseService } from './delete-fixed-expense.service';

describe('DeleteFixedExpenseService', () => {
  let prisma: MockPrismaService;
  let service: DeleteFixedExpenseService;

  const fixedExpense = {
    id: 'fixed-expense-1',
    userId: 'user-1',
    deletedAt: null,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-20T15:00:00.000Z'));
    prisma = makePrisma();
    service = new DeleteFixedExpenseService(prisma as unknown as PrismaService);
    prisma.fixedExpense.findFirst.mockResolvedValue(fixedExpense);
    prisma.fixedExpense.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...fixedExpense, ...data }),
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve fazer soft delete do FixedExpense', async () => {
    await expect(
      service.deleteFixedExpense('user-1', 'fixed-expense-1'),
    ).resolves.toMatchObject({
      id: 'fixed-expense-1',
      deletedAt: expect.any(Date),
    });

    expect(prisma.fixedExpense.update).toHaveBeenCalledWith({
      where: { id: 'fixed-expense-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('deve fazer soft delete apenas de parcelas futuras ativas', async () => {
    await service.deleteFixedExpense('user-1', 'fixed-expense-1');

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        fixedExpenseId: 'fixed-expense-1',
        userId: 'user-1',
        deletedAt: null,
        billingDate: {
          gte: new Date('2025-06-20T00:00:00.000Z'),
        },
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
  });

  it('deve preservar parcelas passadas ao filtrar billingDate menor que hoje fora do update', async () => {
    await service.deleteFixedExpense('user-1', 'fixed-expense-1');

    expect(prisma.transaction.updateMany).not.toHaveBeenCalledWith({
      where: expect.objectContaining({
        billingDate: {
          lt: expect.any(Date),
        },
      }),
      data: expect.anything(),
    });
  });

  it('deve ignorar parcelas ja soft-deletadas', async () => {
    await service.deleteFixedExpense('user-1', 'fixed-expense-1');

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
      }),
      data: expect.anything(),
    });
  });

  it('deve rejeitar delete de gasto fixo inexistente, de outro usuario ou ja deletado', async () => {
    prisma.fixedExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteFixedExpense('user-1', 'fixed-expense-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.fixedExpense.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'fixed-expense-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(prisma.fixedExpense.update).not.toHaveBeenCalled();
  });

  it('não deve fazer hard delete', async () => {
    await service.deleteFixedExpense('user-1', 'fixed-expense-1');

    expect(prisma.fixedExpense.delete).not.toHaveBeenCalled();
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });
});
