import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { makePrisma, makeUser, MockPrismaService } from './auth-test-utils';
import { RegisterAuthService } from './register-auth.service';

describe('RegisterAuthService', () => {
  let prisma: MockPrismaService;
  let service: RegisterAuthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new RegisterAuthService(prisma as unknown as PrismaService);
  });

  it('deve criar usuario com hash Argon2 e nunca retornar passwordHash', async () => {
    const createdUser = makeUser({
      passwordHash: await argon2.hash('password-123'),
    });

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.register({
      name: 'User One',
      email: 'user@example.com',
      password: 'password-123',
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'User One',
        email: 'user@example.com',
        passwordHash: expect.any(String),
      },
    });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      'password-123',
    );
  });

  it('deve rejeitar registro com email duplicado', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(
      service.register({
        name: 'User One',
        email: 'user@example.com',
        password: 'password-123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
