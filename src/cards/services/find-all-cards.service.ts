import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllCardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllCards = async (userId: string) =>
    this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
}
