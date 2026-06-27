import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/hash-token.util';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';

type RefreshAuthResult = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class RefreshAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly generateAuthTokensService: GenerateAuthTokensService,
    private readonly prisma: PrismaService,
  ) {}

  refresh = async (refreshToken: string): Promise<RefreshAuthResult> => {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    const now = new Date();
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: { revokedAt: now },
      });

      if (count === 0) {
        throw this.invalidRefreshTokenError();
      }

      const newRefreshToken =
        await this.generateAuthTokensService.generateRefreshToken(
          payload.sub,
          payload.email,
        );

      await tx.refreshToken.create({
        data: {
          userId: payload.sub,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: addDays(now, 7),
        },
      });

      const accessToken =
        await this.generateAuthTokensService.generateAccessToken(
          payload.sub,
          payload.email,
        );

      return { accessToken, refreshToken: newRefreshToken };
    });
  };

  private verifyRefreshToken = async (refreshToken: string) => {
    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw this.invalidRefreshTokenError();
    }
  };

  private invalidRefreshTokenError = () =>
    new UnauthorizedException('Refresh token invalido.');
}
