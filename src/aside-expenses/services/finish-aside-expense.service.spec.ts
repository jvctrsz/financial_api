import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FinishAsideExpenseService } from './finish-aside-expense.service';

describe('FinishAsideExpenseService', () => {
  let prisma: MockPrismaService;
  let service: FinishAsideExpenseService;

  const recurrentAsideExpense = {
    id: 'aside-expense-1',
    userId: 'user-1',
    recurrent: true,
    deletedAt: null,
    endMonth: null,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-20T12:00:00.000Z'));
    prisma = makePrisma();
    service = new FinishAsideExpenseService(prisma as unknown as PrismaService);
    prisma.asideExpense.findFirst.mockResolvedValue(recurrentAsideExpense);
    prisma.asideExpense.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...recurrentAsideExpense, ...data }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve definir endMonth ao finalizar um AsideExpense recorrente', async () => {
    await expect(
      service.finishAsideExpense('user-1', 'aside-expense-1', {
        endMonth: '2025-08-15',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        endMonth: new Date('2025-08-01T00:00:00.000Z'),
      }),
    );

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: {
        endMonth: new Date('2025-08-01T00:00:00.000Z'),
      },
    });
  });

  it('deve assumir o mes atual como endMonth quando o body não informar o campo', async () => {
    await service.finishAsideExpense('user-1', 'aside-expense-1', {});

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: {
        endMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
    });
  });

  it('deve assumir o mes atual como endMonth quando endMonth vier null', async () => {
    await service.finishAsideExpense('user-1', 'aside-expense-1', {
      endMonth: null,
    });

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: {
        endMonth: new Date('2025-06-01T00:00:00.000Z'),
      },
    });
  });

  it('deve rejeitar finalizacao de AsideExpense não recorrente', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue({
      ...recurrentAsideExpense,
      recurrent: false,
    });

    await expect(
      service.finishAsideExpense('user-1', 'aside-expense-1', {
        endMonth: '2025-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.asideExpense.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar AsideExpense inexistente, soft-deletado ou de outro usuario', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.finishAsideExpense('user-2', 'aside-expense-1', {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.asideExpense.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'aside-expense-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
    expect(prisma.asideExpense.update).not.toHaveBeenCalled();
  });

  it('não deve alterar deletedAt ao finalizar', async () => {
    await service.finishAsideExpense('user-1', 'aside-expense-1', {
      endMonth: '2025-08-01',
    });

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: {
        endMonth: new Date('2025-08-01T00:00:00.000Z'),
      },
    });
  });

  it('deve permitir sobrescrever um endMonth existente', async () => {
    prisma.asideExpense.findFirst.mockResolvedValue({
      ...recurrentAsideExpense,
      endMonth: new Date('2025-07-01T00:00:00.000Z'),
    });

    await service.finishAsideExpense('user-1', 'aside-expense-1', {
      endMonth: '2025-09-20',
    });

    expect(prisma.asideExpense.update).toHaveBeenCalledWith({
      where: { id: 'aside-expense-1' },
      data: {
        endMonth: new Date('2025-09-01T00:00:00.000Z'),
      },
    });
  });
});
