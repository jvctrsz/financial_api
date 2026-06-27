import { Response } from 'express';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { LoginAuthService } from './services/login-auth.service';
import { LogoutAuthService } from './services/logout-auth.service';
import { RefreshAuthService } from './services/refresh-auth.service';
import { RegisterAuthService } from './services/register-auth.service';
import { REFRESH_TOKEN_COOKIE_OPTIONS } from './utils/refresh-token-cookie.util';

describe('AuthController', () => {
  let registerAuthService: Pick<RegisterAuthService, 'register'>;
  let loginAuthService: Pick<LoginAuthService, 'login'>;
  let refreshAuthService: Pick<RefreshAuthService, 'refresh'>;
  let logoutAuthService: Pick<LogoutAuthService, 'logout'>;
  let controller: AuthController;
  let response: Pick<Response, 'cookie' | 'clearCookie'>;

  beforeEach(() => {
    registerAuthService = {
      register: jest.fn(),
    };
    loginAuthService = {
      login: jest.fn(),
    };
    refreshAuthService = {
      refresh: jest.fn(),
    };
    logoutAuthService = {
      logout: jest.fn(),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    controller = new AuthController(
      registerAuthService as RegisterAuthService,
      loginAuthService as LoginAuthService,
      refreshAuthService as RefreshAuthService,
      logoutAuthService as LogoutAuthService,
    );
  });

  it('deve enviar refreshToken no cookie ao fazer login', async () => {
    (loginAuthService.login as jest.Mock).mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(
      controller.login(
        { email: 'user@example.com', password: 'password-123' },
        response as Response,
      ),
    ).resolves.toEqual({ accessToken: 'access-token' });

    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      REFRESH_TOKEN_COOKIE_OPTIONS,
    );
  });

  it('deve substituir refreshToken no cookie ao renovar tokens', async () => {
    (refreshAuthService.refresh as jest.Mock).mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    await expect(
      controller.refresh(
        { cookies: { refreshToken: 'old-refresh-token' } } as never,
        response as Response,
      ),
    ).resolves.toEqual({ accessToken: 'new-access-token' });

    expect(refreshAuthService.refresh).toHaveBeenCalledWith(
      'old-refresh-token',
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new-refresh-token',
      REFRESH_TOKEN_COOKIE_OPTIONS,
    );
  });

  it('deve limpar cookie no logout mesmo sem Authorization', async () => {
    (logoutAuthService.logout as jest.Mock).mockResolvedValue(undefined);

    await expect(
      controller.logout(
        { cookies: { refreshToken: 'refresh-token' } } as never,
        response as Response,
      ),
    ).resolves.toBeUndefined();

    expect(logoutAuthService.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      REFRESH_TOKEN_COOKIE_OPTIONS,
    );
  });

  it('deve configurar logout para responder 204 No Content', () => {
    const httpCode = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      AuthController.prototype.logout,
    );

    expect(httpCode).toBe(204);
  });

  it('deve limpar cookie no logout sem cookie de refreshToken', async () => {
    (logoutAuthService.logout as jest.Mock).mockResolvedValue(undefined);

    await expect(
      controller.logout({ cookies: {} } as never, response as Response),
    ).resolves.toBeUndefined();

    expect(logoutAuthService.logout).toHaveBeenCalledWith(undefined);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      REFRESH_TOKEN_COOKIE_OPTIONS,
    );
  });
});
