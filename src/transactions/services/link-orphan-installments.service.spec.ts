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
    prisma.$executeRaw.mockResolvedValue(1);
  });

  it('deve vincular parcelas orfas pelo mes de transactionDate', async () => {
    await expect(
      service.linkOrphanInstallments({
        userId: 'user-1',
        periodId: 'period-june',
        referenceMonth,
      }),
    ).resolves.toBe(1);

    const query = prisma.$executeRaw.mock.calls[0][0];

    expect(query.sql).toContain('UPDATE "transactions"');
    expect(query.sql).toContain('"periodId" IS NULL');
    expect(query.sql).toContain('"installmentExpenseId" IS NOT NULL');
    expect(query.sql).toContain('date_trunc(\'month\', "transactionDate")');
    expect(query.sql).not.toContain('"billingDate"');
    expect(query.values).toEqual(['period-june', 'user-1', referenceMonth]);
  });

  it('deve filtrar pelo usuario informado', async () => {
    await service.linkOrphanInstallments({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    expect(prisma.$executeRaw.mock.calls[0][0].sql).toContain(
      '"userId" =',
    );
  });

  it('nao deve afetar transacoes comuns, parcelas ja vinculadas ou fixed expenses', async () => {
    await service.linkOrphanInstallments({
      userId: 'user-1',
      periodId: 'period-june',
      referenceMonth,
    });

    const query = prisma.$executeRaw.mock.calls[0][0];

    expect(query.sql).toContain('"installmentExpenseId" IS NOT NULL');
    expect(query.sql).toContain('"periodId" IS NULL');
  });
});
