import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindIncomesByMonthService } from './find-incomes-by-month.service';

describe('FindIncomesByMonthService', () => {
  let prisma: MockPrismaService;
  let service: FindIncomesByMonthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindIncomesByMonthService(prisma as unknown as PrismaService);
  });

  it('deve listar entradas do mes informado', async () => {
    const incomes = [{ id: 'income-1' }];

    prisma.income.findMany.mockResolvedValue(incomes);

    await expect(service.findIncomesByMonth('user-1', '2025-06')).resolves.toBe(
      incomes,
    );
  });

  it('deve normalizar o mes recebido antes da busca', async () => {
    prisma.income.findMany.mockResolvedValue([]);

    await service.findIncomesByMonth('user-1', '2025-06');

    expect(prisma.income.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        month: new Date('2025-06-01T00:00:00.000Z'),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deve filtrar por userId', async () => {
    prisma.income.findMany.mockResolvedValue([]);

    await service.findIncomesByMonth('user-2', '2025-07');

    expect(prisma.income.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-2',
      }),
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deve filtrar por deletedAt null', async () => {
    prisma.income.findMany.mockResolvedValue([]);

    await service.findIncomesByMonth('user-1', '2025-08');

    expect(prisma.income.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
      }),
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deve rejeitar busca sem month', async () => {
    await expect(
      service.findIncomesByMonth('user-1', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.income.findMany).not.toHaveBeenCalled();
  });

  it('deve rejeitar month invalido', async () => {
    await expect(
      service.findIncomesByMonth('user-1', '2025-13'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.income.findMany).not.toHaveBeenCalled();
  });

  it('não deve retornar entradas de outro usuario ou soft-deletadas', async () => {
    prisma.income.findMany.mockResolvedValue([]);

    await service.findIncomesByMonth('user-1', '2025-09');

    expect(prisma.income.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        month: new Date('2025-09-01T00:00:00.000Z'),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
