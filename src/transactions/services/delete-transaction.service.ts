import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  deleteTransaction = async (userId: string, transactionId: string) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        deletedAt: null,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    return this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { deletedAt: new Date() },
    });
  };
}
