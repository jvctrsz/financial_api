import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard';

class TestableUserThrottlerGuard extends UserThrottlerGuard {
  track = (request: {
    headers: { authorization?: string };
    ip: string;
    user?: { id?: string };
  }) =>
    this.getTracker(request);
}

describe('UserThrottlerGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  };

  const createGuard = () =>
    new TestableUserThrottlerGuard(
      {} as ThrottlerModuleOptions,
      {} as ThrottlerStorage,
      new Reflector(),
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve rastrear uma rota autenticada pelo userId', async () => {
    const tracker = await createGuard().track({
      headers: {},
      ip: '127.0.0.1',
      user: { id: 'user-id' },
    });

    expect(tracker).toBe('user-id');
  });

  it('deve usar o IP como fallback em uma rota não autenticada', async () => {
    const tracker = await createGuard().track({
      headers: {},
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('127.0.0.1');
  });

  it('deve extrair o userId do JWT antes do JwtGuard do controller', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });

    const tracker = await createGuard().track({
      headers: { authorization: 'Bearer access-token' },
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('user-id');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access-token', {
      secret: 'access-secret',
    });
  });

  it('deve usar o IP quando o JWT for inválido', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    const tracker = await createGuard().track({
      headers: { authorization: 'Bearer invalid-token' },
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('127.0.0.1');
  });
});
