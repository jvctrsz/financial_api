import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { DeleteCategoryService } from './delete-category.service';

describe('DeleteCategoryService', () => {
  let prisma: MockPrismaService;
  let service: DeleteCategoryService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DeleteCategoryService(prisma as unknown as PrismaService);
  });

  it('deve deletar categoria raiz sem filhos', async () => {
    const category = {
      id: 'category-1',
      userId: 'user-1',
      parentId: null,
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.category.delete.mockResolvedValue(category);

    await expect(service.deleteCategory('user-1', 'category-1')).resolves.toBe(
      category,
    );

    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    });
  });

  it('deve deletar subcategoria', async () => {
    const category = {
      id: 'category-2',
      userId: 'user-1',
      parentId: 'category-1',
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.category.delete.mockResolvedValue(category);

    await expect(service.deleteCategory('user-1', 'category-2')).resolves.toBe(
      category,
    );
  });

  it('deve rejeitar delete de categoria inexistente', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCategory('user-1', 'category-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve rejeitar delete de categoria de outro usuário', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCategory('user-2', 'category-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-2',
      },
      include: {
        children: {
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('deve rejeitar delete de categoria raiz com filhos', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      userId: 'user-1',
      parentId: null,
      children: [{ id: 'category-2' }],
    });

    await expect(
      service.deleteCategory('user-1', 'category-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('deve rejeitar delete de subcategoria com transacoes vinculadas', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-2',
      userId: 'user-1',
      parentId: 'category-1',
      children: [],
    });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'transaction-1' });

    await expect(
      service.deleteCategory('user-1', 'category-2'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        categoryId: 'category-2',
      },
      select: {
        id: true,
      },
    });
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });
});
