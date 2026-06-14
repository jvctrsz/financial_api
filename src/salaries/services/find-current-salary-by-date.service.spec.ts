import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindCurrentSalaryByDateService } from './find-current-salary-by-date.service';

describe('FindCurrentSalaryByDateService', () => {
  let prisma: MockPrismaService;
  let service: FindCurrentSalaryByDateService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindCurrentSalaryByDateService(
      prisma as unknown as PrismaService,
    );
  });

  it('deve retornar salário vigente via fallback', async () => {
    const salary = {
      id: 'salary-1',
      paidAt: new Date('2025-05-07T00:00:00.000Z'),
    };

    prisma.salary.findFirst.mockResolvedValue(salary);

    await expect(
      service.findCurrentSalaryByDate(
        'user-1',
        new Date('2025-05-20T00:00:00.000Z'),
      ),
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
      service.findCurrentSalaryByDate(
        'user-1',
        new Date('2025-05-20T00:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
