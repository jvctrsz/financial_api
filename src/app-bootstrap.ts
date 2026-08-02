import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

const getFrontendOrigin = () => process.env.FRONTEND_URL?.replace(/\/+$/, '');

export const configureApp = (app: INestApplication) => {
  app.use(cookieParser());
  app.enableCors({
    origin: getFrontendOrigin(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
};
