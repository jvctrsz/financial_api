import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChangeDefaultCardService {
  constructor(private readonly prisma: PrismaService) {}

  changeDefaultCard = async (userId: string, cardId: string) =>
    this.prisma.$transaction(async (tx) => {
      const card = await tx.card.findFirst({
        where: {
          id: cardId,
          userId,
        },
      });

      if (!card) {
        throw new NotFoundException('Cartão não encontrado.');
      }

      await tx.card.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: { isDefault: false },
      });

      const updated = await tx.card.update({
        where: { id: card.id },
        data: {
          isDefault: true,
        },
      });

      return updated;
    });
}
