import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FindAllCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllCategories = async (userId: string) =>
    this.prisma.category.findMany({
      where: {
        userId,
        parentId: null,
      },
      select: {
        id: true,
        name: true,
        children: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
}
