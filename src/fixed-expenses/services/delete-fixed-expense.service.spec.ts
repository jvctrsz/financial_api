import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteFixedExpenseService } from './delete-fixed-expense.service';

describe('DeleteFixedExpenseService', () => {
  let prisma: MockPrismaService;
  let service: DeleteFixedExpenseService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteFixedExpenseService(prisma as unknown as PrismaService);
  });

  it('deve fazer soft delete do FixedExpense e das transações futuras vinculadas', async () => {
    const fixedExpense = {
      id: 'fixed-expense-1',
      userId: 'user-1',
      deletedAt: null,
    };

    prisma.fixedExpense.findFirst.mockResolvedValue(fixedExpense);
    prisma.fixedExpense.update.mockResolvedValue({
      ...fixedExpense,
      deletedAt: new Date(),
    });
    prisma.transaction.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      service.deleteFixedExpense('user-1', 'fixed-expense-1'),
    ).resolves.toMatchObject({
      id: 'fixed-expense-1',
      userId: 'user-1',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        fixedExpenseId: 'fixed-expense-1',
        userId: 'user-1',
        deletedAt: null,
        billingDate: {
          gte: expect.any(Date) as Date,
        },
      },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
  });

  it('deve rejeitar FixedExpense inexistente, de outro usuário ou já deletado', async () => {
    prisma.fixedExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteFixedExpense('user-1', 'fixed-expense-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
  });
});
