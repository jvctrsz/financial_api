import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
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

    return this.generateAuthTokensService.generateTokens(user);
  };

  private invalidCredentialsError = () =>
    new UnauthorizedException('Credenciais invalidas.');
}
