import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateIncomeService } from './create-income.service';

describe('CreateIncomeService', () => {
  let prisma: MockPrismaService;
  let service: CreateIncomeService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CreateIncomeService(prisma as unknown as PrismaService);
  });

  it('deve criar uma entrada mensal usando o userId autenticado', async () => {
    const income = {
      id: 'income-1',
      userId: 'user-1',
      amount: 500,
      description: 'Freelance landing page',
      month: new Date('2025-06-01T00:00:00.000Z'),
      deletedAt: null,
    };

    prisma.income.create.mockResolvedValue(income);

    await expect(
      service.createIncome('user-1', {
        amount: 500,
        description: 'Freelance landing page',
        month: '2025-06-15',
      }),
    ).resolves.toBe(income);

    expect(prisma.income.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        amount: 500,
        description: 'Freelance landing page',
        month: new Date('2025-06-01T00:00:00.000Z'),
      },
    });
  });

  it('deve normalizar month para o primeiro dia do mes', async () => {
    prisma.income.create.mockResolvedValue({ id: 'income-1' });

    await service.createIncome('user-1', {
      amount: 750,
      description: 'Freelance sistema interno',
      month: '2025-06-20',
    });

    expect(prisma.income.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        month: new Date('2025-06-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve criar entrada com amount, description e month corretos', async () => {
    prisma.income.create.mockResolvedValue({ id: 'income-1' });

    await service.createIncome('user-1', {
      amount: 1250.5,
      description: 'Aluguel recebido',
      month: '2025-07-03',
    });

    expect(prisma.income.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        amount: 1250.5,
        description: 'Aluguel recebido',
        month: new Date('2025-07-01T00:00:00.000Z'),
      },
    });
  });

  it('nao deve depender de Salary, SalaryPeriod, Transaction ou preferencias', async () => {
    prisma.income.create.mockResolvedValue({ id: 'income-1' });

    await service.createIncome('user-1', {
      amount: 300,
      description: 'Bonus',
      month: '2025-08-10',
    });

    expect(prisma.salary?.findFirst).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod?.findFirst).not.toHaveBeenCalled();
    expect(prisma.transaction?.create).not.toHaveBeenCalled();
    expect(prisma.user?.findFirst).not.toHaveBeenCalled();
    expect(prisma.user?.update).not.toHaveBeenCalled();
  });
});
