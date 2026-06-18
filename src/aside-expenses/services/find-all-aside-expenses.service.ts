import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllAsideExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllAsideExpenses = async (userId: string) => {
    return this.prisma.asideExpense.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [{ startMonth: 'asc' }, { createdAt: 'asc' }],
    });
  };
}
