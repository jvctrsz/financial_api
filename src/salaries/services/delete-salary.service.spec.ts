import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UnlinkOrphanTransactionsService } from '../../transactions/services/unlink-orphan-transactions.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteSalaryService } from './delete-salary.service';

describe('DeleteSalaryService', () => {
  let prisma: MockPrismaService;
  let unlinkOrphanTransactionsService: {
    unlinkOrphanTransactions: jest.Mock;
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
    unlinkOrphanTransactionsService = {
      unlinkOrphanTransactions: jest.fn().mockResolvedValue({ count: 0 }),
    };
    service = new DeleteSalaryService(
      prisma as unknown as PrismaService,
      unlinkOrphanTransactionsService as unknown as UnlinkOrphanTransactionsService,
    );

    prisma.salary.findFirst.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst
      .mockResolvedValueOnce(period)
      .mockResolvedValueOnce(previousPeriod);
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.salaryPeriod.delete.mockResolvedValue(period);
    prisma.salary.delete.mockResolvedValue(salary);
    prisma.salaryPeriod.update.mockResolvedValue({
      ...previousPeriod,
      endedAt: null,
    });
  });

  it('deve permitir deletar o salário mais recente', async () => {
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

  it('deve rejeitar salário inexistente', async () => {
    prisma.salary.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteSalary('user-1', 'salary-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it('deve rejeitar salário de outro usuario', async () => {
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

  it('deve rejeitar delete de salário que não seja o mais recente', async () => {
    prisma.salaryPeriod.findFirst.mockReset();
    prisma.salaryPeriod.findFirst.mockResolvedValue({
      ...period,
      endedAt: new Date('2025-07-05T00:00:00.000Z'),
    });

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it('deve bloquear delete se existir transção DEBIT vinculada ao periodo', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-debit',
      type: TransactionType.DEBIT,
    });

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        periodId: 'period-june',
        type: {
          in: [TransactionType.DEBIT, TransactionType.PIX],
        },
      },
      select: {
        id: true,
      },
    });
    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it('deve bloquear delete se existir transção PIX vinculada ao periodo', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-pix',
      type: TransactionType.PIX,
    });

    await expect(
      service.deleteSalary('user-1', 'salary-june'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions,
    ).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.delete).not.toHaveBeenCalled();
    expect(prisma.salary.delete).not.toHaveBeenCalled();
  });

  it('deve desvincular transações CREDIT antes de deletar', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions,
    ).toHaveBeenCalledWith(
      {
        periodId: 'period-june',
      },
      prisma,
    );
    expect(
      unlinkOrphanTransactionsService.unlinkOrphanTransactions.mock
        .invocationCallOrder[0],
    ).toBeLessThan(prisma.salaryPeriod.delete.mock.invocationCallOrder[0]);
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

  it('deve buscar o periodo anterior por endedAt igual ao paidAt do salário menos um dia', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'user-1',
        endedAt: new Date('2025-06-05T00:00:00.000Z'),
      },
    });
  });

  it('não deve usar orderBy para escolher o periodo anterior', async () => {
    await service.deleteSalary('user-1', 'salary-june');

    expect(prisma.salaryPeriod.findFirst.mock.calls[1][0]).not.toHaveProperty(
      'orderBy',
    );
  });

  it('deve funcionar quando não houver periodo anterior', async () => {
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
