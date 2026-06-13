import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllSalariesService } from './find-all-salaries.service';

describe('FindAllSalariesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllSalariesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllSalariesService(prisma as unknown as PrismaService);
  });

  it('deve listar salários do usuário em ordem decrescente de pagamento', async () => {
    const salaries = [
      {
        id: 'salary-2',
        userId: 'user-1',
        paidAt: new Date('2025-06-06T00:00:00.000Z'),
      },
      {
        id: 'salary-1',
        userId: 'user-1',
        paidAt: new Date('2025-05-07T00:00:00.000Z'),
      },
    ];

    prisma.salary.findMany.mockResolvedValue(salaries);

    await expect(service.execute('user-1')).resolves.toBe(salaries);

    expect(prisma.salary.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { paidAt: 'desc' },
    });
  });
});
