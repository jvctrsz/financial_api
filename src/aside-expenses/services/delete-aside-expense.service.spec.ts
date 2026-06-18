import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteAsideExpenseService } from './delete-aside-expense.service';

describe('DeleteAsideExpenseService', () => {
  let prisma: MockPrismaService;
  let service: DeleteAsideExpenseService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteAsideExpenseService(prisma as unknown as PrismaService);
  });

  it('deve fazer soft delete setando deletedAt', async () => {
    const asideExpense = {
      id: 'aside-expense-1',
      userId: 'user-1',
      deletedAt: null,
    };
    const deletedAsideExpense = {
      ...asideExpense,
      deletedAt: new Date('2025-06-18T00:00:00.000Z'),
    };

    prisma.asideExpense.findFirst.mockResolvedValue(asideExpense);
    prisma.asideExpense.update.mockResolvedValue(deletedAsideExpense);

    await expect(
      service.deleteAsideExpense('user-1', 'aside-expense-1'),
    ).resolves.toBe(deletedAsideExpense);

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('deve buscar usando id, userId e deletedAt null', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue({ id: 'aside-expense-1' });
    prisma.asideExpense.update.mockResolvedValue({ id: 'aside-expense-1' });

    await service.deleteAsideExpense('user-1', 'aside-expense-1');

    expect(prisma.asideExpense.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'aside-expense-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar registro inexistente', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteAsideExpense('user-1', 'aside-expense-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.asideExpense.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar registro de outro usuário', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteAsideExpense('user-2', 'aside-expense-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.asideExpense.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'aside-expense-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
  });

  it('não deve fazer hard delete', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue({ id: 'aside-expense-1' });
    prisma.asideExpense.update.mockResolvedValue({ id: 'aside-expense-1' });

    await service.deleteAsideExpense('user-1', 'aside-expense-1');

    expect(prisma.asideExpense.delete).not.toHaveBeenCalled();
  });
});
