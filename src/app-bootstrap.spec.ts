import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp, getFrontendOrigins } from './app-bootstrap';

describe('getFrontendOrigins', () => {
  it('deve normalizar apenas barras finais da origem', () => {
    expect(getFrontendOrigins('https://app.example.com///')).toEqual([
      'https://app.example.com',
    ]);
  });

  it('deve aceitar uma lista explicita de origens', () => {
    expect(
      getFrontendOrigins(
        'http://localhost:5173/, https://app.example.com///',
      ),
    ).toEqual(['http://localhost:5173', 'https://app.example.com']);
  });

  it('deve rejeitar configuracao ausente para nao habilitar wildcard', () => {
    expect(() => getFrontendOrigins('')).toThrow(
      'FRONTEND_URL must contain at least one explicit origin',
    );
  });

  it('deve rejeitar wildcard explicitamente configurado', () => {
    expect(() => getFrontendOrigins('*')).toThrow(
      'FRONTEND_URL must contain at least one explicit origin',
    );
  });
});

describe('configureApp CORS', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('deve responder o preflight com origem exata e credentials', async () => {
    const frontendOrigin = 'https://app.example.com';
    const testingModule = await Test.createTestingModule({}).compile();
    app = testingModule.createNestApplication();

    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = `${frontendOrigin}/`;

    try {
      configureApp(app);
      await app.init();

      await request(app.getHttpServer())
        .options('/auth/refresh')
        .set('Origin', frontendOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .expect(204)
        .expect('access-control-allow-origin', frontendOrigin)
        .expect('access-control-allow-credentials', 'true');
    } finally {
      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }
    }
  });
});
