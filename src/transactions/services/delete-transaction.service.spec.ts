import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteTransactionService } from './delete-transaction.service';

describe('DeleteTransactionService', () => {
  let prisma: MockPrismaService;
  let service: DeleteTransactionService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteTransactionService(prisma as unknown as PrismaService);
  });

  it('deve fazer soft delete de transação propria', async () => {
    const transaction = {
      id: 'transaction-1',
      userId: 'user-1',
      deletedAt: null,
    };

    prisma.transaction.findFirst.mockResolvedValue(transaction);
    prisma.transaction.update.mockResolvedValue({
      ...transaction,
      deletedAt: new Date(),
    });

    await expect(
      service.deleteTransaction('user-1', 'transaction-1'),
    ).resolves.toMatchObject({
      id: 'transaction-1',
      userId: 'user-1',
    });

    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: { deletedAt: expect.any(Date) as Date },
    });
  });

  it('deve rejeitar transação inexistente', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteTransaction('user-1', 'transaction-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve rejeitar transação de outro usuario ou já deletada', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteTransaction('user-2', 'transaction-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'transaction-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
  });
});
