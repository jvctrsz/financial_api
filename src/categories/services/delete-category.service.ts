import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  deleteCategory = async (userId: string, categoryId: string) => {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      include: {
        children: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (category.parentId === null && category.children.length > 0) {
      throw new BadRequestException(
        'Não é permitido deletar categoria raiz com subcategorias.',
      );
    }

    if (category.parentId !== null) {
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          categoryId: category.id,
        },
        select: {
          id: true,
        },
      });

      if (transaction) {
        throw new BadRequestException(
          'Não é permitido deletar subcategoria com transações vinculadas.',
        );
      }
    }

    return this.prisma.category.delete({
      where: { id: category.id },
    });
  };
}
