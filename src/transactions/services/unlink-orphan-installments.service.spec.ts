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

  it('deve voltar periodId para NULL somente em parcelas vinculadas ao periodo informado', async () => {
    await expect(
      service.unlinkOrphanInstallments({
        periodId: 'period-june',
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        fixedExpenseId: {
          not: null,
        },
      },
      data: {
        periodId: null,
      },
    });
  });

  it('não deve afetar transações comuns sem fixedExpenseId', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
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
