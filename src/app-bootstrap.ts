import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export const getFrontendOrigins = (frontendUrl = process.env.FRONTEND_URL) => {
  const origins = frontendUrl
    ?.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (!origins?.length || origins.includes('*')) {
    throw new Error('FRONTEND_URL must contain at least one explicit origin');
  }

  return origins;
};

export const configureApp = (app: INestApplication) => {
  app.use(cookieParser());
  app.enableCors({
    origin: getFrontendOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
};
