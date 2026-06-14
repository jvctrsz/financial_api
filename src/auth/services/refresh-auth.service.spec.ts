import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';
import { RefreshAuthService } from './refresh-auth.service';

describe('RefreshAuthService', () => {
  let jwtService: Pick<JwtService, 'verifyAsync'>;
  let configService: Pick<ConfigService, 'getOrThrow'>;
  let generateAuthTokensService: Pick<
    GenerateAuthTokensService,
    'generateAccessToken'
  >;
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
    };
    service = new RefreshAuthService(
      jwtService as JwtService,
      configService as ConfigService,
      generateAuthTokensService as GenerateAuthTokensService,
    );
  });

  it('deve renovar accessToken com refreshToken valido', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
    });
    (
      generateAuthTokensService.generateAccessToken as jest.Mock
    ).mockResolvedValue('new-access-token');

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
      secret: 'refresh-secret',
    });
  });

  it('deve rejeitar refreshToken invalido', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error('invalid token'),
    );

    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
