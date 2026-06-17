import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteIncomeService } from './delete-income.service';

describe('DeleteIncomeService', () => {
  let prisma: MockPrismaService;
  let service: DeleteIncomeService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteIncomeService(prisma as unknown as PrismaService);
  });

  it('deve fazer soft delete usando deletedAt now', async () => {
    const income = { id: 'income-1', userId: 'user-1', deletedAt: null };
    const deletedIncome = {
      ...income,
      deletedAt: new Date('2025-06-16T00:00:00.000Z'),
    };

    prisma.income.findFirst.mockResolvedValue(income);
    prisma.income.update.mockResolvedValue(deletedIncome);

    await expect(service.deleteIncome('user-1', 'income-1')).resolves.toBe(
      deletedIncome,
    );

    expect(prisma.income.update).toHaveBeenCalledWith({
      where: { id: 'income-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('deve buscar a entrada por id, userId e deletedAt null', async () => {
    prisma.income.findFirst.mockResolvedValue({ id: 'income-1' });
    prisma.income.update.mockResolvedValue({ id: 'income-1' });

    await service.deleteIncome('user-1', 'income-1');

    expect(prisma.income.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'income-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar delete de entrada inexistente', async () => {
    prisma.income.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteIncome('user-1', 'income-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.income.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar delete de entrada de outro usuario', async () => {
    prisma.income.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteIncome('user-2', 'income-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.income.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'income-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar delete de entrada ja soft-deletada', async () => {
    prisma.income.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteIncome('user-1', 'income-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('nao deve remover fisicamente o registro', async () => {
    prisma.income.findFirst.mockResolvedValue({ id: 'income-1' });
    prisma.income.update.mockResolvedValue({ id: 'income-1' });

    await service.deleteIncome('user-1', 'income-1');

    expect(prisma.income.delete).not.toHaveBeenCalled();
  });
});
