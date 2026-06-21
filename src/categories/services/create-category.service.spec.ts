import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { CreateCategoryService } from './create-category.service';

describe('CreateCategoryService', () => {
  let prisma: MockPrismaService;
  let service: CreateCategoryService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CreateCategoryService(prisma as unknown as PrismaService);
  });

  it('deve criar categoria raiz', async () => {
    const category = {
      id: 'category-1',
      userId: 'user-1',
      name: 'Alimentação',
      parentId: null,
    };

    prisma.category.create.mockResolvedValue(category);

    await expect(
      service.createCategory('user-1', { name: 'Alimentação' }),
    ).resolves.toBe(category);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Alimentação',
        parentId: null,
      },
    });
  });

  it('deve criar subcategoria apontando para categoria raiz do mesmo usuário', async () => {
    const parent = {
      id: 'category-1',
      userId: 'user-1',
      name: 'Alimentação',
      parentId: null,
    };
    const category = {
      id: 'category-2',
      userId: 'user-1',
      name: 'Mercado',
      parentId: 'category-1',
    };

    prisma.category.findFirst.mockResolvedValue(parent);
    prisma.category.create.mockResolvedValue(category);

    await expect(
      service.createCategory('user-1', {
        name: 'Mercado',
        parentId: 'category-1',
      }),
    ).resolves.toBe(category);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Mercado',
        parentId: 'category-1',
      },
    });
  });

  it('deve rejeitar subcategoria apontando para categoria inexistente', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createCategory('user-1', {
        name: 'Mercado',
        parentId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar subcategoria apontando para categoria de outro usuário', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createCategory('user-2', {
        name: 'Mercado',
        parentId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-2',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar subcategoria apontando para categoria soft-deletada', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.createCategory('user-1', {
        name: 'Mercado',
        parentId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        userId: 'user-1',
        deletedAt: null,
      },
    });
  });

  it('deve rejeitar subcategoria apontando para outra subcategoria', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-2',
      userId: 'user-1',
      name: 'Mercado',
      parentId: 'category-1',
    });

    await expect(
      service.createCategory('user-1', {
        name: 'Atacarejo',
        parentId: 'category-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não deve usar userId vindo do body', async () => {
    prisma.category.create.mockResolvedValue({ id: 'category-1' });

    await service.createCategory('user-1', {
      name: 'Alimentação',
      userId: 'user-2',
    } as never);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Alimentação',
        parentId: null,
      },
    });
  });
});
