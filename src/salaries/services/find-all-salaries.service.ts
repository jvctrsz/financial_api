import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllSalariesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllSalaries = async (userId: string) =>
    this.prisma.salary.findMany({
      where: { userId },
      orderBy: { paidAt: 'desc' },
    });
}
