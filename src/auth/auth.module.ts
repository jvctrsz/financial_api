import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { GenerateAuthTokensService } from './services/generate-auth-tokens.service';
import { LoginAuthService } from './services/login-auth.service';
import { RefreshAuthService } from './services/refresh-auth.service';
import { RegisterAuthService } from './services/register-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const authServices = [
  GenerateAuthTokensService,
  LoginAuthService,
  RefreshAuthService,
  RegisterAuthService,
];

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [...authServices, JwtStrategy],
  exports: authServices,
})
export class AuthModule {}
