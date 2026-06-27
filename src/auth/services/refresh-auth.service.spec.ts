import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as hashTokenUtil from '../utils/hash-token.util';
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve rotacionar refreshToken valido e renovar accessToken', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
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
    expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashTokenUtil.hashToken('refresh-token'),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: hashTokenUtil.hashToken('new-refresh-token'),
        expiresAt: expect.any(Date),
      },
    });
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    expect(
      prisma.refreshToken.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.refreshToken.create.mock.invocationCallOrder[0]);
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
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

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
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashTokenUtil.hashToken('revoked-token'),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('deve permitir apenas uma rotação concorrente do mesmo refreshToken', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    (
      generateAuthTokensService.generateRefreshToken as jest.Mock
    ).mockResolvedValue('new-refresh-token');
    (
      generateAuthTokensService.generateAccessToken as jest.Mock
    ).mockResolvedValue('new-access-token');

    const results = await Promise.allSettled([
      service.refresh('refresh-token'),
      service.refresh('refresh-token'),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: expect.any(UnauthorizedException),
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(2);
  });

  it('deve calcular o tokenHash de entrada uma unica vez por chamada', async () => {
    const hashTokenSpy = jest.spyOn(hashTokenUtil, 'hashToken');

    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    (
      generateAuthTokensService.generateRefreshToken as jest.Mock
    ).mockResolvedValue('new-refresh-token');
    (
      generateAuthTokensService.generateAccessToken as jest.Mock
    ).mockResolvedValue('new-access-token');

    await service.refresh('refresh-token');

    expect(
      hashTokenSpy.mock.calls.filter(([token]) => token === 'refresh-token'),
    ).toHaveLength(1);
  });
});
