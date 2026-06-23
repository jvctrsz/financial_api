import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { PayTransactionService } from './pay-transaction.service';

describe('PayTransactionService', () => {
  let prisma: MockPrismaService;
  let service: PayTransactionService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PayTransactionService(prisma as unknown as PrismaService);
  });

  it('deve marcar paid como true sem alterar outros campos', async () => {
    const transaction = {
      id: 'transaction-1',
      userId: 'user-1',
      paid: false,
      deletedAt: null,
      billingDate: new Date('2025-06-01T00:00:00.000Z'),
      periodId: 'period-1',
    };

    prisma.transaction.findFirst.mockResolvedValue(transaction);
    prisma.transaction.update.mockResolvedValue({ ...transaction, paid: true });

    await expect(
      service.payTransaction('user-1', 'transaction-1'),
    ).resolves.toMatchObject({
      id: 'transaction-1',
      paid: true,
      billingDate: transaction.billingDate,
      periodId: 'period-1',
    });

    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: { paid: true },
    });
  });

  it('deve rejeitar transacao com paid null', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      userId: 'user-1',
      paid: null,
      deletedAt: null,
    });

    await expect(
      service.payTransaction('user-1', 'transaction-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar transacao soft-deletada', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      userId: 'user-1',
      paid: false,
      deletedAt: new Date(),
    });

    await expect(
      service.payTransaction('user-1', 'transaction-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar transacao inexistente ou de outro usuario', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.payTransaction('user-2', 'transaction-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'transaction-1',
        userId: 'user-2',
      },
    });
  });
});
