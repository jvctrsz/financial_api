import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class CreateCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory = async (userId: string, dto: CreateCategoryDto) => {
    if (!dto.parentId) {
      return this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          parentId: null,
        },
      });
    }

    const parent = await this.prisma.category.findFirst({
      where: {
        id: dto.parentId,
        userId,
        deletedAt: null,
      },
    });

    if (!parent) {
      throw new BadRequestException('Categoria pai inválida.');
    }

    if (parent.parentId !== null) {
      throw new BadRequestException(
        'Subcategorias so podem apontar para categorias raiz.',
      );
    }

    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        parentId: parent.id,
      },
    });
  };
}
