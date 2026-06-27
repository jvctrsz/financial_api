import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/hash-token.util';
import { makePrisma, makeUser, MockPrismaService } from './auth-test-utils';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';
import { LoginAuthService } from './login-auth.service';

describe('LoginAuthService', () => {
  let prisma: MockPrismaService;
  let generateAuthTokensService: Pick<
    GenerateAuthTokensService,
    'generateTokens'
  >;
  let service: LoginAuthService;

  beforeEach(() => {
    prisma = makePrisma();
    generateAuthTokensService = {
      generateTokens: jest.fn(),
    };
    service = new LoginAuthService(
      prisma as unknown as PrismaService,
      generateAuthTokensService as GenerateAuthTokensService,
    );
  });

  it('deve retornar accessToken e refreshToken no login valido', async () => {
    const passwordHash = await argon2.hash('password-123');
    const user = makeUser({ passwordHash });

    prisma.user.findUnique.mockResolvedValue(user);
    (generateAuthTokensService.generateTokens as jest.Mock).mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'password-123',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(generateAuthTokensService.generateTokens).toHaveBeenCalledWith(user);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        tokenHash: hashToken('refresh-token'),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(
      'refresh-token',
    );
  });

  it('deve criar registros independentes para multiplos logins do mesmo usuario', async () => {
    const passwordHash = await argon2.hash('password-123');
    const user = makeUser({ passwordHash });

    prisma.user.findUnique.mockResolvedValue(user);
    (generateAuthTokensService.generateTokens as jest.Mock)
      .mockResolvedValueOnce({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      })
      .mockResolvedValueOnce({
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
      });

    await service.login({
      email: 'user@example.com',
      password: 'password-123',
    });
    await service.login({
      email: 'user@example.com',
      password: 'password-123',
    });

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(2);
    expect(prisma.refreshToken.create).toHaveBeenNthCalledWith(1, {
      data: {
        userId: user.id,
        tokenHash: hashToken('refresh-token-1'),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.refreshToken.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: user.id,
        tokenHash: hashToken('refresh-token-2'),
        expiresAt: expect.any(Date),
      },
    });
  });

  it('deve rejeitar credenciais invalidas com erro generico', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
