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

  it('deve fazer soft delete de categoria raiz sem filhos ativos', async () => {
    const category = {
      id: 'category-1',
      userId: 'user-1',
      parentId: null,
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.category.update.mockResolvedValue({
      ...category,
      deletedAt: new Date(),
    });

    await expect(
      service.deleteCategory('user-1', 'category-1'),
    ).resolves.toMatchObject({
      id: 'category-1',
      deletedAt: expect.any(Date) as Date,
    });

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { deletedAt: expect.any(Date) as Date },
    });
  });

  it('deve fazer soft delete de subcategoria sem transações ativas', async () => {
    const category = {
      id: 'category-2',
      userId: 'user-1',
      parentId: 'category-1',
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.category.update.mockResolvedValue({
      ...category,
      deletedAt: new Date(),
    });

    await expect(
      service.deleteCategory('user-1', 'category-2'),
    ).resolves.toMatchObject({
      id: 'category-2',
      deletedAt: expect.any(Date) as Date,
    });
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
        deletedAt: null,
      },
      include: {
        children: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('deve rejeitar delete de categoria raiz com filhos ativos', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      userId: 'user-1',
      parentId: null,
      children: [{ id: 'category-2' }],
    });

    await expect(
      service.deleteCategory('user-1', 'category-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('deve fazer soft delete de categoria raiz com apenas filhos soft-deletados', async () => {
    const category = {
      id: 'category-1',
      userId: 'user-1',
      parentId: null,
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.category.update.mockResolvedValue({
      ...category,
      deletedAt: new Date(),
    });

    await expect(
      service.deleteCategory('user-1', 'category-1'),
    ).resolves.toMatchObject({
      id: 'category-1',
      deletedAt: expect.any(Date) as Date,
    });

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-1',
        deletedAt: null,
      },
      include: {
        children: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('deve rejeitar delete de subcategoria com transações ativas', async () => {
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
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('deve fazer soft delete de subcategoria com apenas transações soft-deletadas', async () => {
    const category = {
      id: 'category-2',
      userId: 'user-1',
      parentId: 'category-1',
      children: [],
    };

    prisma.category.findFirst.mockResolvedValue(category);
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.category.update.mockResolvedValue({
      ...category,
      deletedAt: new Date(),
    });

    await expect(
      service.deleteCategory('user-1', 'category-2'),
    ).resolves.toMatchObject({
      id: 'category-2',
      deletedAt: expect.any(Date) as Date,
    });

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        categoryId: 'category-2',
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  });
});
