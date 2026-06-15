import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllCardsService } from './find-all-cards.service';

describe('FindAllCardsService', () => {
  let prisma: MockPrismaService;
  let service: FindAllCardsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllCardsService(prisma as unknown as PrismaService);
  });

  it('deve listar apenas cartoes do usuario autenticado', async () => {
    const cards = [
      {
        id: 'card-1',
        userId: 'user-1',
        name: 'Nubank',
        closingDay: 6,
      },
    ];

    prisma.card.findMany.mockResolvedValue(cards);

    await expect(service.findAllCards('user-1')).resolves.toBe(cards);

    expect(prisma.card.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('não deve retornar cartoes de outro usuario', async () => {
    prisma.card.findMany.mockResolvedValue([]);

    await service.findAllCards('user-2');

    expect(prisma.card.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('deve retornar array vazio quando usuario não tem cartoes', async () => {
    prisma.card.findMany.mockResolvedValue([]);

    await expect(service.findAllCards('user-1')).resolves.toEqual([]);
  });
});
