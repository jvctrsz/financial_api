import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardDto } from '../dto/create-card.dto';
import { assertClosingDayIsValid } from './card-validation.util';
import { FindAllCardsService } from './find-all-cards.service';

@Injectable()
export class CreateCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly findAllCardsService: FindAllCardsService,
  ) {}

  createCard = async (userId: string, dto: CreateCardDto) => {
    assertClosingDayIsValid(dto.closingDay);
    const isDefault = await this.isCardDefault(userId);
    return this.prisma.card.create({
      data: {
        userId,
        name: dto.name,
        closingDay: dto.closingDay,
        isDefault,
      },
    });
  };

  private isCardDefault = async (userId: string) => {
    const cards = await this.findAllCardsService.findAllCards(userId);
    return !cards?.length;
  };
}
