import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAuthService } from './services/login-auth.service';
import { RefreshAuthService } from './services/refresh-auth.service';
import { RegisterAuthService } from './services/register-auth.service';

type RefreshRequest = Request & {
  cookies: {
    refreshToken?: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerAuthService: RegisterAuthService,
    private readonly loginAuthService: LoginAuthService,
    private readonly refreshAuthService: RefreshAuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerAuthService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.loginAuthService.login(dto);

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Post('refresh')
  refresh(@Req() request: RefreshRequest) {
    return this.refreshAuthService.refresh(request.cookies.refreshToken ?? '');
  }

  private setRefreshTokenCookie = (
    response: Response,
    refreshToken: string,
  ) => {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/auth',
    });
  };
}
