import { ConflictException, NotFoundException } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { SalariesService } from './salaries.service';

type MockPrismaService = {
  salary: {
    create: jest.Mock;
    findFirst: jest.Mock;
  };
  salaryPeriod: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  $transaction: <T>(
    callback: (tx: MockPrismaService) => Promise<T>,
  ) => Promise<T>;
};

const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    salary: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    salaryPeriod: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: <T>(callback: (tx: MockPrismaService) => Promise<T>) =>
      callback(prisma),
  };

  return prisma;
};

describe('SalariesService', () => {
  let prisma: MockPrismaService;
  let service: SalariesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SalariesService(prisma as unknown as PrismaService);
  });

  it('deve criar salário e gerar SalaryPeriod automaticamente', async () => {
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
      service.create('user-1', { amount: 5000, paidAt: '2025-05-07' }),
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
  });

  it('deve atualizar endedAt do período anterior ao inserir novo salário', async () => {
    const paidAt = new Date('2025-06-06T00:00:00.000Z');
    const previousPeriod = {
      id: 'period-may',
      endedAt: null,
    };
    const salary = {
      id: 'salary-june',
      userId: 'user-1',
      amount: 5200,
      paidAt,
    };

    prisma.salary.create.mockResolvedValue(salary);
    prisma.salaryPeriod.findFirst.mockResolvedValue(previousPeriod);
    prisma.salaryPeriod.update.mockResolvedValue({
      ...previousPeriod,
      endedAt: subDays(paidAt, 1),
    });
    prisma.salaryPeriod.create.mockResolvedValue({
      id: 'period-june',
      salaryId: salary.id,
    });

    await service.create('user-1', { amount: 5200, paidAt: '2025-06-06' });

    expect(prisma.salaryPeriod.update).toHaveBeenCalledWith({
      where: { id: 'period-may' },
      data: { endedAt: new Date('2025-06-05T00:00:00.000Z') },
    });
  });

  it('deve rejeitar dois salários no mesmo dia para o mesmo usuário', async () => {
    prisma.salary.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('user-1', { amount: 5000, paidAt: '2025-05-07' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve retornar salário vigente via fallback', async () => {
    const salary = {
      id: 'salary-1',
      paidAt: new Date('2025-05-07T00:00:00.000Z'),
    };

    prisma.salary.findFirst.mockResolvedValue(salary);

    await expect(
      service.findCurrentByDate('user-1', new Date('2025-05-20T00:00:00.000Z')),
    ).resolves.toBe(salary);

    expect(prisma.salary.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        paidAt: {
          lte: new Date('2025-05-20T00:00:00.000Z'),
        },
      },
      orderBy: { paidAt: 'desc' },
    });
  });

  it('deve retornar erro se nenhum salário foi cadastrado', async () => {
    prisma.salary.findFirst.mockResolvedValue(null);

    await expect(
      service.findCurrentByDate('user-1', new Date('2025-05-20T00:00:00.000Z')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
