import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllInstallmentExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllInstallmentExpenses = async (userId: string) => {
    return this.prisma.installmentExpense.findMany({
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
      orderBy: [{ startMonth: 'desc' }, { createdAt: 'desc' }],
    });
  };
}
