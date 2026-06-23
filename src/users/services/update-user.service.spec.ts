import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, MockPrismaService } from '../test-utils/mock-prisma';
import { UpdateUserService } from './update-user.service';
import { userPublicSelect } from './user-public-select';

describe('UpdateUserService', () => {
  let prisma: MockPrismaService;
  let service: UpdateUserService;

  const currentUser = {
    id: 'user-1',
    email: 'joao@example.com',
  };

  const publicUser = {
    id: 'user-1',
    name: 'Joao',
    email: 'joao@example.com',
    createdAt: new Date('2026-06-17T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = makePrisma();
    service = new UpdateUserService(prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue(currentUser);
    prisma.user.update.mockResolvedValue(publicUser);
  });

  it('deve atualizar nome isoladamente', async () => {
    await expect(
      service.updateUser('user-1', { name: 'Joao Atualizado' }),
    ).resolves.toBe(publicUser);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Joao Atualizado' },
      select: userPublicSelect,
    });
  });

  it('deve atualizar email isoladamente validando unicidade', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(currentUser)
      .mockResolvedValueOnce(null);

    await service.updateUser('user-1', { email: 'novo@example.com' });

    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: 'novo@example.com' },
      select: { id: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'novo@example.com' },
      select: userPublicSelect,
    });
  });

  it('deve rejeitar email ja em uso por outro usuario', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(currentUser)
      .mockResolvedValueOnce({ id: 'user-2' });

    await expect(
      service.updateUser('user-1', { email: 'usado@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('deve permitir manter o proprio email atual sem erro de unicidade', async () => {
    await service.updateUser('user-1', { email: 'joao@example.com' });

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'joao@example.com' },
      select: userPublicSelect,
    });
  });

  it('deve atualizar senha gerando novo hash Argon2 sem retornar passwordHash', async () => {
    const plainPassword = 'password-123';

    const result = await service.updateUser('user-1', {
      password: plainPassword,
    });

    const savedHash = prisma.user.update.mock.calls[0][0].data.passwordHash;

    expect(savedHash).toEqual(expect.any(String));
    expect(savedHash).not.toBe(plainPassword);
    await expect(argon2.verify(savedHash, plainPassword)).resolves.toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: savedHash },
      select: userPublicSelect,
    });
  });

  it('deve rejeitar atualizacao de usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUser('user-1', { name: 'Joao' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve rejeitar body sem nenhum campo informado', async () => {
    await expect(service.updateUser('user-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
