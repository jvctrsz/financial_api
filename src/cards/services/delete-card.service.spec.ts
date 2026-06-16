import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteCardService } from './delete-card.service';

describe('DeleteCardService', () => {
  let prisma: MockPrismaService;
  let service: DeleteCardService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteCardService(prisma as unknown as PrismaService);
  });

  it('deve deletar cartão do proprio usuario', async () => {
    const card = { id: 'card-1', userId: 'user-1' };

    prisma.card.findFirst.mockResolvedValue(card);
    prisma.card.delete.mockResolvedValue(card);

    await expect(service.deleteCard('user-1', 'card-1')).resolves.toBe(card);

    expect(prisma.card.delete).toHaveBeenCalledWith({
      where: { id: 'card-1' },
    });
  });

  it('deve rejeitar delete de cartão inexistente', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(service.deleteCard('user-1', 'card-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve rejeitar delete de cartão pertencente a outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(service.deleteCard('user-2', 'card-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-2',
      },
    });
  });

  it('deve rejeitar delete de cartao com transacoes vinculadas', async () => {
    prisma.card.findFirst.mockResolvedValue({ id: 'card-1', userId: 'user-1' });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'transaction-1' });

    await expect(service.deleteCard('user-1', 'card-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        cardId: 'card-1',
      },
      select: {
        id: true,
      },
    });
    expect(prisma.card.delete).not.toHaveBeenCalled();
  });
});
