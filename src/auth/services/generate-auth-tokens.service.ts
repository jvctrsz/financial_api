import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class GenerateAuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateTokens = async (user: User): Promise<Tokens> => ({
    accessToken: await this.generateAccessToken(user.id, user.email),
    refreshToken: await this.generateRefreshToken(user.id, user.email),
  });

  generateAccessToken = async (userId: string, email: string) =>
    this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.getJwtExpiresIn('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

  private generateRefreshToken = async (userId: string, email: string) =>
    this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.getJwtExpiresIn('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

  private getJwtExpiresIn = (
    key: string,
    fallback: string,
  ): NonNullable<JwtSignOptions['expiresIn']> =>
    this.configService.get<string>(key, fallback) as NonNullable<
      JwtSignOptions['expiresIn']
    >;
}
