import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateAsideExpenseService } from './create-aside-expense.service';

describe('CreateAsideExpenseService', () => {
  let prisma: MockPrismaService;
  let service: CreateAsideExpenseService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CreateAsideExpenseService(prisma as unknown as PrismaService);
  });

  it('deve criar AsideExpense com userId recebido do JWT', async () => {
    const asideExpense = {
      id: 'aside-expense-1',
      userId: 'user-1',
      description: 'Reserva de emergencia',
      amount: 500,
      recurrent: false,
      startMonth: new Date('2025-06-01T00:00:00.000Z'),
      endMonth: null,
      deletedAt: null,
    };

    prisma.asideExpense.create.mockResolvedValue(asideExpense);

    await expect(
      service.createAsideExpense('user-1', {
        description: 'Reserva de emergencia',
        amount: 500,
        startMonth: '2025-06-15',
      }),
    ).resolves.toBe(asideExpense);

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        description: 'Reserva de emergencia',
        amount: 500,
        recurrent: false,
        startMonth: new Date('2025-06-01T00:00:00.000Z'),
        endMonth: null,
        deletedAt: null,
      },
    });
  });

  it('deve criar com recurrent false quando o campo não for enviado', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Evento futuro',
      amount: 300,
      startMonth: '2025-07-10',
    });

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurrent: false,
      }),
    });
  });

  it('deve normalizar startMonth para o primeiro dia do mes', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Poupanca',
      amount: 250,
      startMonth: '2025-08-20',
    });

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startMonth: new Date('2025-08-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve normalizar endMonth para o primeiro dia do mes quando informado', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Viagem',
      amount: 400,
      recurrent: true,
      startMonth: '2025-08-20',
      endMonth: '2025-12-25',
    });

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startMonth: new Date('2025-08-01T00:00:00.000Z'),
        endMonth: new Date('2025-12-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve permitir recurrent true com endMonth null', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Reserva mensal',
      amount: 200,
      recurrent: true,
      startMonth: '2025-09-01',
      endMonth: null,
    });

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurrent: true,
        endMonth: null,
      }),
    });
  });

  it('deve permitir recurrent true com endMonth maior ou igual a startMonth', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Curso',
      amount: 150,
      recurrent: true,
      startMonth: '2025-10-15',
      endMonth: '2025-10-20',
    });

    expect(prisma.asideExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startMonth: new Date('2025-10-01T00:00:00.000Z'),
        endMonth: new Date('2025-10-01T00:00:00.000Z'),
      }),
    });
  });

  it('deve rejeitar recurrent true com endMonth menor que startMonth', async () => {
    await expect(
      service.createAsideExpense('user-1', {
        description: 'Reserva',
        amount: 100,
        recurrent: true,
        startMonth: '2025-10-10',
        endMonth: '2025-09-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.asideExpense.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar recurrent false com endMonth informado', async () => {
    await expect(
      service.createAsideExpense('user-1', {
        description: 'Compra planejada',
        amount: 100,
        recurrent: false,
        startMonth: '2025-10-10',
        endMonth: '2025-11-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.asideExpense.create).not.toHaveBeenCalled();
  });

  it('não deve criar transacao ou consultar entidades fora do escopo', async () => {
    prisma.asideExpense.create.mockResolvedValue({ id: 'aside-expense-1' });

    await service.createAsideExpense('user-1', {
      description: 'Reserva',
      amount: 100,
      startMonth: '2025-11-10',
    });

    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.salary.findFirst).not.toHaveBeenCalled();
    expect(prisma.salaryPeriod.findFirst).not.toHaveBeenCalled();
    expect(prisma.category.findFirst).not.toHaveBeenCalled();
    expect(prisma.card.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
