import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllTransactionsService } from './find-all-transactions.service';

describe('FindAllTransactionsService', () => {
  let prisma: MockPrismaService;
  let service: FindAllTransactionsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllTransactionsService(
      prisma as unknown as PrismaService,
    );
    prisma.transaction.findMany.mockResolvedValue([]);
  });

  it('deve listar por periodId', async () => {
    await service.findAllTransactions('user-1', { periodId: 'period-1' });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        periodId: 'period-1',
        deletedAt: null,
      },
      orderBy: { transactionDate: 'desc' },
    });
  });

  it('deve listar por billingMonth', async () => {
    await service.findAllTransactions('user-1', { billingMonth: '2025-05' });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
        billingDate: {
          gte: new Date('2025-05-01T00:00:00.000Z'),
          lt: new Date('2025-06-01T00:00:00.000Z'),
        },
      },
      orderBy: { billingDate: 'desc' },
    });
  });

  it('deve rejeitar nenhum filtro', async () => {
    await expect(
      service.findAllTransactions('user-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar ambos os filtros', async () => {
    await expect(
      service.findAllTransactions('user-1', {
        periodId: 'period-1',
        billingMonth: '2025-05',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
