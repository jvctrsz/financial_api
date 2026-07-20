import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

type ThrottlerRequest = {
  headers: {
    authorization?: string;
  };
  ip: string;
  user?: {
    id?: string;
  };
};

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker = async (
    request: ThrottlerRequest,
  ): Promise<string> => {
    if (request.user?.id) {
      return request.user.id;
    }

    const accessToken = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];

    if (!accessToken) {
      return request.ip;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      return payload.sub;
    } catch {
      return request.ip;
    }
  };
}
