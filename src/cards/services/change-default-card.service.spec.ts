import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { ChangeDefaultCardService } from './change-default-card.service';

describe('ChangeDefaultCardService', () => {
  let prisma: MockPrismaService;
  let service: ChangeDefaultCardService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ChangeDefaultCardService(prisma as unknown as PrismaService);
  });

  it('deve definir cartao do usuario autenticado como padrao', async () => {
    const card = {
      id: 'card-1',
      userId: 'user-1',
      name: 'Nubank',
      closingDay: 6,
      isDefault: false,
    };
    const updatedCard = {
      ...card,
      isDefault: true,
    };

    prisma.card.findFirst.mockResolvedValue(card);
    prisma.card.updateMany.mockResolvedValue({ count: 1 });
    prisma.card.update.mockResolvedValue(updatedCard);

    await expect(service.changeDefaultCard('user-1', 'card-1')).resolves.toBe(
      updatedCard,
    );

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-1',
      },
    });
    expect(prisma.card.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isDefault: true,
      },
      data: { isDefault: false },
    });
    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: {
        isDefault: true,
      },
    });
  });

  it('deve rejeitar cartao inexistente', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.changeDefaultCard('user-1', 'card-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.card.updateMany).not.toHaveBeenCalled();
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar cartao de outro usuario', async () => {
    prisma.card.findFirst.mockResolvedValue(null);

    await expect(
      service.changeDefaultCard('user-2', 'card-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'card-1',
        userId: 'user-2',
      },
    });
  });
});
