import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/hash-token.util';
import { makePrisma, MockPrismaService } from './auth-test-utils';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';
import { RefreshAuthService } from './refresh-auth.service';

describe('RefreshAuthService', () => {
  let jwtService: Pick<JwtService, 'verifyAsync'>;
  let configService: Pick<ConfigService, 'getOrThrow'>;
  let generateAuthTokensService: Pick<
    GenerateAuthTokensService,
    'generateAccessToken' | 'generateRefreshToken'
  >;
  let prisma: MockPrismaService;
  let service: RefreshAuthService;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn(() => 'refresh-secret'),
    };
    generateAuthTokensService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };
    prisma = makePrisma();
    service = new RefreshAuthService(
      jwtService as JwtService,
      configService as ConfigService,
      generateAuthTokensService as GenerateAuthTokensService,
      prisma as unknown as PrismaService,
    );
  });

  it('deve rotacionar refreshToken valido e renovar accessToken', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-token-id',
      userId: 'user-1',
      tokenHash: hashToken('refresh-token'),
      expiresAt: new Date('2026-06-20T00:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-06-13T00:00:00.000Z'),
    });
    (
      generateAuthTokensService.generateRefreshToken as jest.Mock
    ).mockResolvedValue('new-refresh-token');
    (
      generateAuthTokensService.generateAccessToken as jest.Mock
    ).mockResolvedValue('new-access-token');

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
      secret: 'refresh-secret',
    });
    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: hashToken('refresh-token'),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: hashToken('new-refresh-token'),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-token-id' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(
      prisma.refreshToken.create.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.refreshToken.update.mock.invocationCallOrder[0]);
  });

  it('deve rejeitar refreshToken invalido', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error('invalid token'),
    );

    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve rejeitar refreshToken sem registro ativo correspondente', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.findFirst.mockResolvedValue(null);

    await expect(service.refresh('missing-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar refreshToken revogado ou expirado no banco', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.findFirst.mockResolvedValue(null);

    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: hashToken('revoked-token'),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    });
  });
});
