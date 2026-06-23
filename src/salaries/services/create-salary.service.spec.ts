import { ConflictException } from '@nestjs/common';
import { GenerateFixedExpenseTransactionsService } from '../../fixed-expenses/services/generate-fixed-expense-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LinkOrphanInstallmentsService } from '../../transactions/services/link-orphan-installments.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateSalaryService } from './create-salary.service';

describe('CreateSalaryService', () => {
  let prisma: MockPrismaService;
  let linkOrphanInstallmentsService: {
    linkOrphanInstallments: jest.Mock;
  };
  let generateFixedExpenseTransactionsService: {
    generateFixedExpenseTransactions: jest.Mock;
  };
  let service: CreateSalaryService;

  beforeEach(() => {
    prisma = makePrisma();
    linkOrphanInstallmentsService = {
      linkOrphanInstallments: jest.fn().mockResolvedValue({ count: 0 }),
    };
    generateFixedExpenseTransactionsService = {
      generateFixedExpenseTransactions: jest.fn().mockResolvedValue([]),
    };
    service = new CreateSalaryService(
      prisma as unknown as PrismaService,
      linkOrphanInstallmentsService as unknown as LinkOrphanInstallmentsService,
      generateFixedExpenseTransactionsService as unknown as GenerateFixedExpenseTransactionsService,
    );
  });

  it('deve criar salario e gerar SalaryPeriod automaticamente', async () => {
    const salary = {
      id: 'salary-1',
      userId: 'user-1',
      amount: 5000,
      paidAt: new Date('2025-05-07T00:00:00.000Z'),
    };
    const period = {
      id: 'period-1',
      userId: 'user-1',
      salaryId: 'salary-1',
      startedAt: salary.paidAt,
      endedAt: null,
      referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
    };

    prisma.salary.create.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst.mockResolvedValue(null);
    prisma.salaryPeriod.create.mockResolvedValue(period);

    await expect(
      service.createSalary('user-1', { amount: 5000, paidAt: '2025-05-07' }),
    ).resolves.toEqual({ salary, period });

    expect(prisma.salary.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        amount: 5000,
        paidAt: new Date('2025-05-07T00:00:00.000Z'),
      },
    });
    expect(prisma.salaryPeriod.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        salaryId: 'salary-1',
        startedAt: salary.paidAt,
        endedAt: null,
        referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
      },
    });
    expect(
      linkOrphanInstallmentsService.linkOrphanInstallments,
    ).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        periodId: 'period-1',
        referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
      },
      prisma,
    );
    expect(
      prisma.salaryPeriod.create.mock.invocationCallOrder[0],
    ).toBeLessThan(
      linkOrphanInstallmentsService.linkOrphanInstallments.mock
        .invocationCallOrder[0],
    );
    expect(
      generateFixedExpenseTransactionsService.generateFixedExpenseTransactions,
    ).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        periodId: 'period-1',
        referenceMonth: new Date('2025-05-01T00:00:00.000Z'),
      },
      prisma,
    );
    expect(
      linkOrphanInstallmentsService.linkOrphanInstallments.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      generateFixedExpenseTransactionsService.generateFixedExpenseTransactions
        .mock.invocationCallOrder[0],
    );
  });

  it('deve atualizar endedAt do periodo anterior ao inserir novo salario', async () => {
    const paidAt = new Date('2025-06-06T00:00:00.000Z');
    const previousPeriod = {
      id: 'period-may',
      startedAt: new Date('2025-05-07T00:00:00.000Z'),
      endedAt: null,
    };
    const salary = {
      id: 'salary-june',
      userId: 'user-1',
      amount: 5200,
      paidAt,
    };

    prisma.salary.create.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst
      .mockResolvedValueOnce(previousPeriod)
      .mockResolvedValueOnce(null);
    prisma.salaryPeriod.update.mockResolvedValue({
      ...previousPeriod,
      endedAt: new Date('2025-06-05T00:00:00.000Z'),
    });
    prisma.salaryPeriod.create.mockResolvedValue({
      id: 'period-june',
      salaryId: salary.id,
      referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
    });

    await service.createSalary('user-1', {
      amount: 5200,
      paidAt: '2025-06-06',
    });

    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'user-1',
        startedAt: {
          lt: paidAt,
        },
      },
      orderBy: { startedAt: 'desc' },
    });
    expect(prisma.salaryPeriod.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'user-1',
        startedAt: {
          gt: paidAt,
        },
      },
      orderBy: { startedAt: 'asc' },
    });
    expect(prisma.salaryPeriod.update).toHaveBeenCalledWith({
      where: { id: 'period-may' },
      data: { endedAt: new Date('2025-06-05T00:00:00.000Z') },
    });
    expect(
      linkOrphanInstallmentsService.linkOrphanInstallments,
    ).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        periodId: 'period-june',
        referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
      prisma,
    );
    expect(
      generateFixedExpenseTransactionsService.generateFixedExpenseTransactions,
    ).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        periodId: 'period-june',
        referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
      prisma,
    );
  });

  it('deve inserir salario antigo entre periodos sem gerar periodo invertido', async () => {
    const paidAt = new Date('2025-06-05T00:00:00.000Z');
    const previousPeriod = {
      id: 'period-may',
      startedAt: new Date('2025-05-05T00:00:00.000Z'),
      endedAt: null,
    };
    const nextPeriod = {
      id: 'period-july',
      startedAt: new Date('2025-07-05T00:00:00.000Z'),
      endedAt: null,
    };
    const salary = {
      id: 'salary-june',
      userId: 'user-1',
      amount: 5200,
      paidAt,
    };

    prisma.salary.create.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst
      .mockResolvedValueOnce(previousPeriod)
      .mockResolvedValueOnce(nextPeriod);
    prisma.salaryPeriod.create.mockResolvedValue({
      id: 'period-june',
      salaryId: salary.id,
      referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
    });

    await service.createSalary('user-1', {
      amount: 5200,
      paidAt: '2025-06-05',
    });

    expect(prisma.salaryPeriod.update).toHaveBeenCalledWith({
      where: { id: 'period-may' },
      data: { endedAt: new Date('2025-06-04T00:00:00.000Z') },
    });
    expect(prisma.salaryPeriod.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        salaryId: 'salary-june',
        startedAt: paidAt,
        endedAt: new Date('2025-07-04T00:00:00.000Z'),
        referenceMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
    });
  });

  it('deve rejeitar dois salarios no mesmo dia para o mesmo usuario', async () => {
    prisma.salary.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createSalary('user-1', { amount: 5000, paidAt: '2025-05-07' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
