import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllFixedExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllFixedExpenses = async (userId: string) => {
    return this.prisma.fixedExpense.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        card: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  };
}
