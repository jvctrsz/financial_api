import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteCardService {
  constructor(private readonly prisma: PrismaService) {}

  deleteCard = async (userId: string, cardId: string) => {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
      },
    });

    if (!card) {
      throw new NotFoundException('Cartão não encontrado.');
    }

    return this.prisma.card.delete({
      where: { id: card.id },
    });
  };
}
