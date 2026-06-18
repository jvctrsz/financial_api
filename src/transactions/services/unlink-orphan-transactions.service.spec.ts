import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { UnlinkOrphanTransactionsService } from './unlink-orphan-transactions.service';

describe('UnlinkOrphanTransactionsService', () => {
  let prisma: MockPrismaService;
  let service: UnlinkOrphanTransactionsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UnlinkOrphanTransactionsService(
      prisma as unknown as PrismaService,
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('deve voltar periodId para NULL em transações CREDIT vinculadas ao periodo informado', async () => {
    await expect(
      service.unlinkOrphanTransactions({
        periodId: 'period-june',
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        type: TransactionType.CREDIT,
      },
      data: {
        periodId: null,
      },
    });
  });

  it('não deve afetar transações DEBIT', async () => {
    await service.unlinkOrphanTransactions({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: TransactionType.CREDIT,
      }),
      data: expect.any(Object),
    });
  });

  it('não deve afetar transações PIX', async () => {
    await service.unlinkOrphanTransactions({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.not.objectContaining({
        type: TransactionType.PIX,
      }),
      data: expect.any(Object),
    });
  });

  it('não deve afetar transações de outros periodos', async () => {
    await service.unlinkOrphanTransactions({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        periodId: 'period-june',
      }),
      data: expect.any(Object),
    });
  });

  it('deve chamar o Prisma com filtros explicitos de periodId e type CREDIT', async () => {
    await service.unlinkOrphanTransactions({
      periodId: 'period-june',
    });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        type: TransactionType.CREDIT,
      },
      data: {
        periodId: null,
      },
    });
  });
});
