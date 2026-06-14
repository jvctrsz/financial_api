import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
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
