import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAuthService } from './services/login-auth.service';
import { LogoutAuthService } from './services/logout-auth.service';
import { RefreshAuthService } from './services/refresh-auth.service';
import { RegisterAuthService } from './services/register-auth.service';
import { REFRESH_TOKEN_COOKIE_OPTIONS } from './utils/refresh-token-cookie.util';

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
    private readonly logoutAuthService: LogoutAuthService,
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
  async refresh(
    @Req() request: RefreshRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.refreshAuthService.refresh(
      request.cookies.refreshToken ?? '',
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: RefreshRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.logoutAuthService.logout(request.cookies.refreshToken);
    response.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  private setRefreshTokenCookie = (
    response: Response,
    refreshToken: string,
  ) => {
    response.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  };
}
