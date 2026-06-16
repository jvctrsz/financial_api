import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindAllCategoriesService } from './find-all-categories.service';

describe('FindAllCategoriesService', () => {
  let prisma: MockPrismaService;
  let service: FindAllCategoriesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindAllCategoriesService(prisma as unknown as PrismaService);
  });

  it('deve listar apenas categorias do usuário autenticado', async () => {
    const categories = [
      {
        id: 'category-1',
        name: 'Alimentação',
        children: [],
      },
    ];

    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.findAllCategories('user-1')).resolves.toBe(categories);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
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
  });

  it('não deve retornar categorias de outro usuário', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await service.findAllCategories('user-2');

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-2',
          parentId: null,
        },
      }),
    );
  });

  it('deve retornar árvore aninhada corretamente', async () => {
    const categories = [
      {
        id: 'category-1',
        name: 'Alimentação',
        children: [
          { id: 'category-2', name: 'Lanches' },
          { id: 'category-3', name: 'Mercado' },
        ],
      },
    ];

    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.findAllCategories('user-1')).resolves.toEqual(
      categories,
    );
  });

  it('deve retornar children vazio quando categoria raiz não possui filhos', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'category-1',
        name: 'Transporte',
        children: [],
      },
    ]);

    await expect(service.findAllCategories('user-1')).resolves.toEqual([
      {
        id: 'category-1',
        name: 'Transporte',
        children: [],
      },
    ]);
  });

  it('deve retornar array vazio quando usuário não possui categorias', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await expect(service.findAllCategories('user-1')).resolves.toEqual([]);
  });
});
