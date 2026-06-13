import { ConflictException } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateSalaryService } from './create-salary.service';

describe('CreateSalaryService', () => {
  let prisma: MockPrismaService;
  let service: CreateSalaryService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CreateSalaryService(prisma as unknown as PrismaService);
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
      service.execute('user-1', { amount: 5000, paidAt: '2025-05-07' }),
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

    await service.execute('user-1', { amount: 5200, paidAt: '2025-06-06' });

    expect(prisma.salaryPeriod.update).toHaveBeenCalledWith({
      where: { id: 'period-may' },
      data: { endedAt: new Date('2025-06-05T00:00:00.000Z') },
    });
  });

  it('deve rejeitar dois salários no mesmo dia para o mesmo usuário', async () => {
    prisma.salary.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.execute('user-1', { amount: 5000, paidAt: '2025-05-07' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
