import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        cardId: card.id,
      },
      select: {
        id: true,
      },
    });

    if (transaction) {
      throw new BadRequestException(
        'Não é permitido deletar cartão com transações vinculadas.',
      );
    }

    return this.prisma.card.delete({
      where: { id: card.id },
    });
  };
}
