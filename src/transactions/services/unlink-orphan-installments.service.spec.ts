import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { UnlinkOrphanInstallmentsService } from './unlink-orphan-installments.service';

describe('UnlinkOrphanInstallmentsService', () => {
  let prisma: MockPrismaService;
  let service: UnlinkOrphanInstallmentsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UnlinkOrphanInstallmentsService(
      prisma as unknown as PrismaService,
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('deve voltar periodId para NULL em parcelas ou transações soft-deletadas do periodo informado', async () => {
    await expect(
      service.unlinkOrphanInstallments({
        periodId: 'period-june',
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        OR: [
          {
            installmentExpenseId: {
              not: null,
            },
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
      data: {
        periodId: null,
      },
    });
  });

  it('deve desvincular transação comum soft-deletada de qualquer tipo', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          {
            deletedAt: {
              not: null,
            },
          },
        ]),
      }),
      data: expect.any(Object),
    });
  });

  it('não deve afetar transações comuns ativas', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        OR: [
          {
            installmentExpenseId: {
              not: null,
            },
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
      data: expect.any(Object),
    });
  });

  it('não deve afetar transações de outros periodos', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        periodId: 'period-june',
      }),
      data: expect.any(Object),
    });
  });
});
