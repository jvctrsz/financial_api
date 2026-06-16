import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateCardService } from './create-card.service';
import { FindAllCardsService } from './find-all-cards.service';

describe('CreateCardService', () => {
  let prisma: MockPrismaService;
  let findAllCardsService: Pick<FindAllCardsService, 'findAllCards'>;
  let service: CreateCardService;

  beforeEach(() => {
    prisma = makePrisma();
    findAllCardsService = {
      findAllCards: jest.fn().mockResolvedValue([]),
    };
    service = new CreateCardService(
      prisma as unknown as PrismaService,
      findAllCardsService as FindAllCardsService,
    );
  });

  it('deve criar cartão com userId autenticado', async () => {
    const card = {
      id: 'card-1',
      userId: 'user-1',
      name: 'Nubank',
      closingDay: 6,
    };

    prisma.card.create.mockResolvedValue(card);

    await expect(
      service.createCard('user-1', { name: 'Nubank', closingDay: 6 }),
    ).resolves.toBe(card);

    expect(prisma.card.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Nubank',
        closingDay: 6,
        isDefault: true,
      },
    });
  });

  it('não deve usar userId vindo do body', async () => {
    prisma.card.create.mockResolvedValue({ id: 'card-1' });

    await service.createCard('user-1', {
      name: 'Nubank',
      closingDay: 6,
      userId: 'user-2',
    } as never);

    expect(prisma.card.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Nubank',
        closingDay: 6,
        isDefault: true,
      },
    });
  });

  it('deve rejeitar closingDay menor que 1', async () => {
    await expect(
      service.createCard('user-1', { name: 'Nubank', closingDay: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar closingDay maior que 31', async () => {
    await expect(
      service.createCard('user-1', { name: 'Nubank', closingDay: 32 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
