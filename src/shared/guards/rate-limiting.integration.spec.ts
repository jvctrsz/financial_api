import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import {
  AUTH_RATE_LIMIT,
  GLOBAL_RATE_LIMIT,
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../constants/rate-limit.constants';
import { UserThrottlerGuard } from './user-throttler.guard';

const JWT_ACCESS_SECRET = 'rate-limiting-integration-secret';

@Controller('rate-limit-test')
class RateLimitTestController {
  @Get('read')
  @Throttle(READ_RATE_LIMIT)
  read() {
    return { ok: true };
  }

  @Post('write')
  @Throttle(WRITE_RATE_LIMIT)
  write() {
    return { ok: true };
  }

  @Post('auth')
  @Throttle(AUTH_RATE_LIMIT)
  auth() {
    return { ok: true };
  }

  @Get('global')
  global() {
    return { ok: true };
  }
}

describe('Rate limiting (integração HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: JWT_ACCESS_SECRET }),
        ThrottlerModule.forRoot([GLOBAL_RATE_LIMIT.default]),
      ],
      controllers: [RateLimitTestController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => JWT_ACCESS_SECRET,
          },
        },
        {
          provide: APP_GUARD,
          useClass: UserThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  const createAccessToken = (userId: string) =>
    jwtService.sign({ sub: userId, email: `${userId}@example.com` });

  it('permite 300 leituras e retorna 429 na 301ª', async () => {
    const accessToken = createAccessToken('read-user');

    for (let requestNumber = 1; requestNumber <= 300; requestNumber += 1) {
      await request(app.getHttpServer())
        .get('/rate-limit-test/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    }

    await request(app.getHttpServer())
      .get('/rate-limit-test/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);
  });

  it('mantém o limite de escrita separado por userId no mesmo IP', async () => {
    const firstAccessToken = createAccessToken('first-user');
    const secondAccessToken = createAccessToken('second-user');

    for (let requestNumber = 1; requestNumber <= 30; requestNumber += 1) {
      await request(app.getHttpServer())
        .post('/rate-limit-test/write')
        .set('Authorization', `Bearer ${firstAccessToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/rate-limit-test/write')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/rate-limit-test/write')
      .set('Authorization', `Bearer ${firstAccessToken}`)
      .expect(429);
    await request(app.getHttpServer())
      .post('/rate-limit-test/write')
      .set('Authorization', `Bearer ${secondAccessToken}`)
      .expect(429);
  });

  it('limita login e refresh por IP mesmo quando há bearer token', async () => {
    const firstAccessToken = createAccessToken('first-user');
    const secondAccessToken = createAccessToken('second-user');

    for (let requestNumber = 1; requestNumber <= 10; requestNumber += 1) {
      const accessToken =
        requestNumber % 2 === 0 ? firstAccessToken : secondAccessToken;

      await request(app.getHttpServer())
        .post('/rate-limit-test/auth')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/rate-limit-test/auth')
      .set('Authorization', `Bearer ${firstAccessToken}`)
      .expect(429);
  });

  it('aplica o fallback global de 100 requests', async () => {
    const accessToken = createAccessToken('global-user');

    for (let requestNumber = 1; requestNumber <= 100; requestNumber += 1) {
      await request(app.getHttpServer())
        .get('/rate-limit-test/global')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    }

    await request(app.getHttpServer())
      .get('/rate-limit-test/global')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);
  });
});
