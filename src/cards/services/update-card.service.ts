import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCardDto } from '../dto/update-card.dto';
import { assertClosingDayIsValid } from './card-validation.util';

@Injectable()
export class UpdateCardService {
  constructor(private readonly prisma: PrismaService) {}

  updateCard = async (userId: string, cardId: string, dto: UpdateCardDto) => {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar o Cartão.',
      );
    }

    if (dto.closingDay !== undefined) {
      assertClosingDayIsValid(dto.closingDay);
    }

    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
      },
    });

    if (!card) {
      throw new NotFoundException('Cartão não encontrado.');
    }

    return this.prisma.card.update({
      where: { id: card.id },
      data: {
        name: dto.name,
        closingDay: dto.closingDay,
      },
    });
  };
}
