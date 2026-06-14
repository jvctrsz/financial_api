import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';

@Injectable()
export class RefreshAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly generateAuthTokensService: GenerateAuthTokensService,
  ) {}

  refresh = async (refreshToken: string): Promise<{ accessToken: string }> => {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      return {
        accessToken: await this.generateAuthTokensService.generateAccessToken(
          payload.sub,
          payload.email,
        ),
      };
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }
  };
}
