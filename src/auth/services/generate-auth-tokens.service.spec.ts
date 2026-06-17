import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { makeUser } from './auth-test-utils';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';

describe('GenerateAuthTokensService', () => {
  let jwtService: Pick<JwtService, 'signAsync'>;
  let configService: {
    get: jest.Mock<string, [key: string, fallback?: string]>;
    getOrThrow: jest.Mock<string, [key: string]>;
  };
  let service: GenerateAuthTokensService;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };

        return values[key] ?? fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
        };

        return values[key];
      }),
    };
    service = new GenerateAuthTokensService(
      jwtService as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('deve gerar accessToken e refreshToken validos', async () => {
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await expect(service.generateTokens(makeUser())).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'user@example.com' },
      { secret: 'access-secret', expiresIn: '15m' },
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'user@example.com' },
      { secret: 'refresh-secret', expiresIn: '7d' },
    );
  });
});
