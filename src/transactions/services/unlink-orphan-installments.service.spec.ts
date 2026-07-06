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
    prisma.$executeRaw.mockResolvedValue(1);
  });

  it('deve desvincular parcelas futuras e transacoes soft-deletadas do periodo informado', async () => {
    await expect(
      service.unlinkOrphanInstallments({
        periodId: 'period-june',
      }),
    ).resolves.toBe(1);

    const query = prisma.$executeRaw.mock.calls[0][0];

    expect(query.sql).toContain('UPDATE "transactions" AS t');
    expect(query.sql).toContain('SET "periodId" = NULL');
    expect(query.sql).toContain('t."periodId" =');
    expect(query.sql).toContain('t."installmentExpenseId" IS NOT NULL');
    expect(query.sql).toContain('t."deletedAt" IS NOT NULL');
    expect(query.values).toEqual(['period-june']);
  });

  it('deve identificar parcelas futuras comparando transactionDate com startMonth', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
    });

    const query = prisma.$executeRaw.mock.calls[0][0];

    expect(query.sql).toContain(
      'date_trunc(\'month\', t."transactionDate")::date <>',
    );
    expect(query.sql).toContain('date_trunc(\'month\', ie."startMonth")::date');
    expect(query.sql).toContain('"installment_expenses" AS ie');
  });

  it('deve preservar parcela 0 ativa e transacoes comuns ativas', async () => {
    await service.unlinkOrphanInstallments({
      periodId: 'period-june',
    });

    const query = prisma.$executeRaw.mock.calls[0][0];

    expect(query.sql).toContain('OR t."deletedAt" IS NOT NULL');
    expect(query.sql).not.toContain('t."installmentExpenseId" IS NULL');
  });
});
