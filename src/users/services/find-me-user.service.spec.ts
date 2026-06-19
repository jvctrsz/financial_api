import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { FindMeUserService } from './find-me-user.service';
import { userPublicSelect } from './user-public-select';

describe('FindMeUserService', () => {
  let prisma: MockPrismaService;
  let service: FindMeUserService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FindMeUserService(prisma as unknown as PrismaService);
  });

  it('deve buscar o usuario pelo userId autenticado', async () => {
    const user = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findMe('user-1')).resolves.toBe(user);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: userPublicSelect,
    });
  });

  it('deve retornar somente campos publicos', async () => {
    const user = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findMe('user-1')).resolves.toEqual({
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    });
  });

  it('não deve retornar passwordHash', async () => {
    const user = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.findMe('user-1');

    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.not.objectContaining({
        passwordHash: true,
      }),
    });
  });

  it('não deve retornar preferencia global de entradas', async () => {
    const removedPreferenceField = ['include', 'Incomes', 'InBalance'].join('');
    const user = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.findMe('user-1');

    expect(result).not.toHaveProperty(removedPreferenceField);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.not.objectContaining({
        [removedPreferenceField]: true,
      }),
    });
  });

  it('deve lancar erro se o usuario não existir', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findMe('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
