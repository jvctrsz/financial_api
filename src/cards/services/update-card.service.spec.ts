import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { UpdateCardService } from './update-card.service';

describe('UpdateCardService', () => {
  let prisma: MockPrismaService;
  let service: UpdateCardService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UpdateCardService(prisma as unknown as PrismaService);
  });

  it('deve atualizar nome do Cartão', async () => {
    const card = { id: 'card-1', userId: 'user-1' };
    const updatedCard = { ...card, name: 'Inter', closingDay: 6 };

    prisma.card.findFirst.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);

    await expect(
      service.updateCard('user-1', 'card-1', { name: 'Inter' }),
    ).resolves.toBe(updatedCard);

    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: {
        name: 'Inter',
        closingDay: undefined,
      },
    });
  });

  it('deve atualizar closingDay', async () => {
    const card = { id: 'card-1', userId: 'user-1' };
    const updatedCard = { ...card, name: 'Nubank', closingDay: 10 };

    prisma.card.findFirst.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);

    await expect(
      service.updateCard('user-1', 'card-1', { closingDay: 10 }),
    ).resolves.toBe(updatedCard);

    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: {
        name: undefined,
        closingDay: 10,
      },
    });
  });

  it('deve rejeitar closingDay menor que 1', async () => {
    await expect(
      service.updateCard('user-1', 'card-1', { closingDay: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar closingDay maior que 31', async () => {
    await expect(
      service.updateCard('user-1', 'card-1', { closingDay: 32 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar update vazio', async () => {
    await expect(
      service.updateCard('user-1', 'card-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar update de Cartão inexistente', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.updateCard('user-1', 'card-1', { name: 'Inter' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve rejeitar update de Cartão pertencente a outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.updateCard('user-2', 'card-1', { name: 'Inter' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-2',
      },
    });
  });
});
