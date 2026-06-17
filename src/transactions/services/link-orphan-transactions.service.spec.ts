import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { LinkOrphanTransactionsService } from './link-orphan-transactions.service';

describe('LinkOrphanTransactionsService', () => {
  let prisma: MockPrismaService;
  let service: LinkOrphanTransactionsService;

  const referenceMonth = new Date('2025-06-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = makePrisma();
    service = new LinkOrphanTransactionsService(
      prisma as unknown as PrismaService,
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('deve vincular transações CREDIT orfas do usuário e billingDate informados', async () => {
    await expect(
      service.linkOrphanTransactions({
        userId: 'user-1',
        periodId: 'period-june',
        referenceMonth,
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: TransactionType.CREDIT,
        periodId: null,
        billingDate: referenceMonth,
      },
      data: {
        periodId: 'period-june',
      },
    });
  });

  it('não deve alterar transações CREDIT de outro usuário', async () => {
    await service.linkOrphanTransactions({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-1',
      }),
      data: expect.any(Object),
    });
  });

  it('não deve alterar transações CREDIT com periodId ja preenchido', async () => {
    await service.linkOrphanTransactions({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        periodId: null,
      }),
      data: expect.any(Object),
    });
  });

  it('não deve alterar transações DEBIT', async () => {
    await service.linkOrphanTransactions({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: TransactionType.CREDIT,
      }),
      data: expect.any(Object),
    });
  });

  it('não deve alterar transações PIX', async () => {
    await service.linkOrphanTransactions({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.not.objectContaining({
        type: TransactionType.PIX,
      }),
      data: expect.any(Object),
    });
  });

  it('deve chamar o Prisma com filtros explicitos de userId, type, periodId e billingDate', async () => {
    await service.linkOrphanTransactions({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: TransactionType.CREDIT,
        periodId: null,
        billingDate: referenceMonth,
      },
      data: {
        periodId: 'period-june',
      },
    });
  });
});
