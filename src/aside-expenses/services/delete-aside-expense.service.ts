import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteAsideExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  deleteAsideExpense = async (userId: string, asideExpenseId: string) => {
    const asideExpense = await this.prisma.asideExpense.findFirst({
      where: {
        id: asideExpenseId,
        userId,
        deletedAt: null,
      },
    });

    if (!asideExpense) {
      throw new NotFoundException('Gasto a parte não encontrado.');
    }

    return this.prisma.asideExpense.update({
      where: { id: asideExpense.id },
      data: { deletedAt: new Date() },
    });
  };
}
