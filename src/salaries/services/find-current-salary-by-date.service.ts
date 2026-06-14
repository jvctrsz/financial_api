import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindCurrentSalaryByDateService {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentSalaryByDate = async (userId: string, date: Date) => {
    const salary = await this.prisma.salary.findFirst({
      where: {
        userId,
        paidAt: {
          lte: date,
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    if (!salary) {
      throw new NotFoundException(
        'Nenhum salário foi cadastrado. Cadastre um salário antes de continuar.',
      );
    }

    return salary;
  };
}
