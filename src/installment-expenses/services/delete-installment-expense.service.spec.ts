import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteInstallmentExpenseService } from './delete-installment-expense.service';

describe('DeleteInstallmentExpenseService', () => {
  let prisma: MockPrismaService;
  let service: DeleteInstallmentExpenseService;

  const installmentExpense = {
    id: 'installment-expense-1',
    userId: 'user-1',
    deletedAt: null,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-20T15:00:00.000Z'));
    prisma = makePrisma();
    service = new DeleteInstallmentExpenseService(
      prisma as unknown as PrismaService,
    );
    prisma.installmentExpense.findFirst.mockResolvedValue(installmentExpense);
    prisma.installmentExpense.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...installmentExpense, ...data }),
    );
    prisma.transaction.updateMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve fazer soft delete do InstallmentExpense', async () => {
    await expect(
      service.deleteInstallmentExpense('user-1', 'installment-expense-1'),
    ).resolves.toMatchObject({
      id: 'installment-expense-1',
      deletedAt: expect.any(Date),
    });

    expect(prisma.installmentExpense.update).toHaveBeenCalledWith({
      where: { id: 'installment-expense-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('deve fazer soft delete apenas de parcelas futuras ativas', async () => {
    await service.deleteInstallmentExpense('user-1', 'installment-expense-1');

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        installmentExpenseId: 'installment-expense-1',
        userId: 'user-1',
        deletedAt: null,
        billingDate: {
          gte: new Date('2025-06-20T00:00:00.000Z'),
        },
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
  });

  it('deve preservar parcelas passadas ao filtrar billingDate menor que hoje fora do update', async () => {
    await service.deleteInstallmentExpense('user-1', 'installment-expense-1');

    expect(prisma.transaction.updateMany).not.toHaveBeenCalledWith({
      where: expect.objectContaining({
        billingDate: {
          lt: expect.any(Date),
        },
      }),
      data: expect.anything(),
    });
  });

  it('deve ignorar parcelas ja soft-deletadas', async () => {
    await service.deleteInstallmentExpense('user-1', 'installment-expense-1');

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
      }),
      data: expect.anything(),
    });
  });

  it('deve rejeitar delete de gasto parcelado inexistente, de outro usuario ou ja deletado', async () => {
    prisma.installmentExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteInstallmentExpense('user-1', 'installment-expense-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.installmentExpense.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'installment-expense-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(prisma.installmentExpense.update).not.toHaveBeenCalled();
  });

  it('não deve fazer hard delete', async () => {
    await service.deleteInstallmentExpense('user-1', 'installment-expense-1');

    expect(prisma.installmentExpense.delete).not.toHaveBeenCalled();
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });
});
