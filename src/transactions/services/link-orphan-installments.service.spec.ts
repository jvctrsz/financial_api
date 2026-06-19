import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { LinkOrphanInstallmentsService } from './link-orphan-installments.service';

describe('LinkOrphanInstallmentsService', () => {
  let prisma: MockPrismaService;
  let service: LinkOrphanInstallmentsService;

  const referenceMonth = new Date('2025-06-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = makePrisma();
    service = new LinkOrphanInstallmentsService(
      prisma as unknown as PrismaService,
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('deve vincular parcelas de FixedExpense orfas do usuario e billingDate informados', async () => {
    await expect(
      service.linkOrphanInstallments({
        userId: 'user-1',
        periodId: 'period-june',
        referenceMonth,
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        fixedExpenseId: {
          not: null,
        },
        periodId: null,
        billingDate: referenceMonth,
      },
      data: {
        periodId: 'period-june',
      },
    });
  });

  it('não deve alterar parcelas de outro usuario', async () => {
    await service.linkOrphanInstallments({
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

  it('não deve alterar transações sem fixedExpenseId', async () => {
    await service.linkOrphanInstallments({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        fixedExpenseId: {
          not: null,
        },
      }),
      data: expect.any(Object),
    });
  });

  it('não deve alterar parcelas com periodId ja preenchido', async () => {
    await service.linkOrphanInstallments({
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
});
