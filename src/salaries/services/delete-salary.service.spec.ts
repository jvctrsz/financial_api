import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UnlinkOrphanInstallmentsService } from '../../transactions/services/unlink-orphan-installments.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteSalaryService } from './delete-salary.service';

describe('DeleteSalaryService', () => {
  let prisma: MockPrismaService;
  let unlinkOrphanInstallmentsService: {
    unlinkOrphanInstallments: jest.Mock;
  };
  let service: DeleteSalaryService;

  const salary = {
    id: 'salary-june',
    userId: 'user-1',
    amount: 5200,
    paidAt: new Date('2025-06-06T00:00:00.000Z'),
  };

  const period = {
    id: 'period-june',
    userId: 'user-1',
    salaryId: salary.id,
    startedAt: salary.paidAt,
    endedAt: null,
    referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
  };

  const previousPeriod = {
    id: 'period-may',
    userId: 'user-1',
    salaryId: 'salary-may',
    startedAt: new Date('2025-05-07T00:00:00.000Z'),
    endedAt: new Date('2025-06-05T00:00:00.000Z'),
    referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = makePrisma();
    unlinkOrphanInstallmentsService = {
      unlinkOrphanInstallments: jest.fn().mockResolvedValue(0),
    };
    service = new DeleteSalaryService(
      prisma as unknown as PrismaService,
      unlinkOrphanInstallmentsService as unknown as UnlinkOrphanInstallmentsService,
    );

    prisma.salary.findFirst.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(previousPeriod);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.salaryPeriod.delete.mockResolvedValue(period);
    prisma.salary.delete.mockResolvedValue(salary);
    prisma.salaryPeriod.update.mockResolvedValue({
      ...previousPeriod,
      endedAt: null,
    });
  });

  it('deve permitir deletar o salario mais recente', async () => {
    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).resolves.toEqual(salary);

    expect(prisma.salary.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'salary-june',
        userId: 'user-1',
      },
    });
    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'user-1',
        salaryId: 'salary-june',
      },
    });
  });

  it('deve rejeitar salario inexistente', async () => {
    prisma.salary.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteSalary('user-1', 'salary-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it('deve rejeitar salario de outro usuario', async () => {
    prisma.salary.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteSalary('user-1', 'salary-from-user-2'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.salary.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'salary-from-user-2',
        userId: 'user-1',
      },
    });
  });

  it('deve rejeitar delete de salario que nao seja o mais recente', async () => {
    prisma.salaryPeriod.findFirst.mockReset();
    prisma.salaryPeriod.findFirst.mockResolvedValue({
      ...period,
      endedAt: new Date('2025-07-05T00:00:00.000Z'),
    });

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it.each([TransactionType.CREDIT, TransactionType.DEBIT, TransactionType.PIX])(
    'deve bloquear delete se existir transacao ativa vinculada ao periodo',
    async (type) => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: `transaction-${type.toLowerCase()}`,
          type,
        },
      ]);

      await expect(
        service.deleteSalary('user-1', 'salary-june'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw.mock.calls[0][0].values).toEqual([
        'period-june',
        TransactionType.CREDIT,
        TransactionType.DEBIT,
        TransactionType.PIX,
      ]);
      expect(
        unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
      ).not.toHaveBeenCalled();
      expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
      expect(prisma.salary.delete).not.toHaveBeenCalled();
    },
  );

  it('deve bloquear delete se existir parcela 0 ativa vinculada ao periodo', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'installment-transaction-1',
        type: TransactionType.CREDIT,
        installmentExpenseId: 'installment-expense-1',
      },
    ]);

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const query = prisma.$queryRaw.mock.calls[0][0];

    expect(query.sql).toContain('date_trunc');
    expect(query.sql).toContain('"transactionDate"');
    expect(query.sql).toContain('"startMonth"');
    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
    ).not.toHaveBeenCalled();
  });

  it('nao deve bloquear delete se houver apenas parcelas futuras ativas vinculadas', async () => {
    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).resolves.toEqual(salary);

    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
    ).toHaveBeenCalledWith(
      {
        periodId: 'period-june',
      },
      prisma,
    );
  });

  it('nao deve bloquear delete se a unica transacao vinculada estiver soft-deletada', async () => {
    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).resolves.toEqual(salary);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw.mock.calls[0][0].sql).toContain(
      't."deletedAt" IS NULL',
    );
  });

  it('deve desvincular transacoes soft-deletadas antes do hard delete do SalaryPeriod', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments,
    ).toHaveBeenCalledWith(
      {
        periodId: 'period-june',
      },
      prisma,
    );
    expect(
      unlinkOrphanInstallmentsService.unlinkOrphanInstallments.mock
        .invocationCallOrder[0],
    ).toBeLessThan(prisma.salaryPeriod.delete.mock.invocationCallOrder[0]);
    expect(prisma.salaryPeriod.delete).toHaveBeenCalledWith({
      where: { id: 'period-june' },
    });
  });

  it('deve fazer hard delete do SalaryPeriod', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.delete).toHaveBeenCalledWith({
      where: { id: 'period-june' },
    });
  });

  it('deve fazer hard delete do Salary', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salary.delete).toHaveBeenCalledWith({
      where: { id: 'salary-june' },
    });
  });

  it('deve reabrir o periodo anterior com endedAt NULL', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.update).toHaveBeenCalledWith({
      where: { id: 'period-may' },
      data: { endedAt: null },
    });
  });

  it('deve buscar o periodo anterior por endedAt igual ao paidAt do salario menos um dia', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'user-1',
        endedAt: new Date('2025-06-05T00:00:00.000Z'),
      },
    });
  });

  it('nao deve usar orderBy para escolher o periodo anterior', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.findFirst.mock.calls[1][0]).not.toHaveProperty(
      'orderBy',
    );
  });

  it('deve funcionar quando nao houver periodo anterior', async () => {
    prisma.salaryPeriod.findFirst.mockReset();
    prisma.salaryPeriod.findFirst
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(null);

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).resolves.toEqual(salary);

    expect(prisma.salaryPeriod.update).not.toHaveBeenCalled();
  });

  it('deve executar o fluxo dentro de $transaction', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
