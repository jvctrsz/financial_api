import { Injectable, UnauthorizedException } from '@nestjs/common';
import { addDays } from 'date-fns';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { hashToken } from '../utils/hash-token.util';
import { GenerateAuthTokensService } from './generate-auth-tokens.service';

@Injectable()
export class LoginAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateAuthTokensService: GenerateAuthTokensService,
  ) {}

  login = async (dto: LoginDto) => {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw this.invalidCredentialsError();
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw this.invalidCredentialsError();
    }

    const tokens = await this.generateAuthTokensService.generateTokens(user);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: addDays(new Date(), 7),
      },
    });

    return tokens;
  };

  private invalidCredentialsError = () =>
    new UnauthorizedException('Credenciais invalidas.');
}
