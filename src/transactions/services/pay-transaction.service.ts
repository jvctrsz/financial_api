import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PayTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  payTransaction = async (userId: string, transactionId: string) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    if (transaction.deletedAt) {
      throw new BadRequestException('Transação deletada não pode ser paga.');
    }

    if (transaction.paid === null) {
      throw new BadRequestException(
        'Esta transação não é uma ocorrência pagável de gasto fixo.',
      );
    }

    return this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { paid: true },
    });
  };
}
