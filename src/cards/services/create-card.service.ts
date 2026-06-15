import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardDto } from '../dto/create-card.dto';
import { assertClosingDayIsValid } from './card-validation.util';

@Injectable()
export class CreateCardService {
  constructor(private readonly prisma: PrismaService) {}

  createCard = async (userId: string, dto: CreateCardDto) => {
    assertClosingDayIsValid(dto.closingDay);

    return this.prisma.card.create({
      data: {
        userId,
        name: dto.name,
        closingDay: dto.closingDay,
      },
    });
  };
}
