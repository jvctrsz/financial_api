import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { UpdateUserPreferencesService } from './update-user-preferences.service';
import { userPublicSelect } from './user-public-select';

describe('UpdateUserPreferencesService', () => {
  let prisma: MockPrismaService;
  let service: UpdateUserPreferencesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UpdateUserPreferencesService(
      prisma as unknown as PrismaService,
    );
  });

  it('deve atualizar includeIncomesInBalance para true', async () => {
    const updatedUser = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      includeIncomesInBalance: true,
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updatePreferences('user-1', true)).resolves.toBe(
      updatedUser,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        includeIncomesInBalance: true,
      },
      select: userPublicSelect,
    });
  });

  it('deve atualizar includeIncomesInBalance para false', async () => {
    const updatedUser = {
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      includeIncomesInBalance: false,
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updatePreferences('user-1', false)).resolves.toBe(
      updatedUser,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        includeIncomesInBalance: false,
      },
      select: userPublicSelect,
    });
  });

  it('deve atualizar somente o usuario do userId autenticado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    prisma.user.update.mockResolvedValue({
      id: 'user-2',
      includeIncomesInBalance: true,
    });

    await service.updatePreferences('user-2', true);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      select: { id: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        includeIncomesInBalance: true,
      },
      select: userPublicSelect,
    });
  });

  it('não deve atualizar nenhum outro campo do usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      includeIncomesInBalance: true,
    });

    await service.updatePreferences('user-1', true);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        includeIncomesInBalance: true,
      },
      select: userPublicSelect,
    });
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty(
      'email',
    );
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty(
      'passwordHash',
    );
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('name');
  });

  it('não deve retornar passwordHash', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      includeIncomesInBalance: true,
      createdAt: new Date('2026-06-17T00:00:00.000Z'),
    });

    const result = await service.updatePreferences('user-1', true);

    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        includeIncomesInBalance: true,
      },
      select: expect.not.objectContaining({
        passwordHash: true,
      }),
    });
  });

  it('deve lancar erro se o usuario não existir', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updatePreferences('user-1', true),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
