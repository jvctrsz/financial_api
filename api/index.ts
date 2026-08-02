import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app-bootstrap';

const server = express();

let bootstrapPromise: Promise<void> | undefined;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  configureApp(app);
  await app.init();
}

export default async function handler(req: Request, res: Response) {
  bootstrapPromise ??= bootstrap();
  await bootstrapPromise;
  return server(req, res);
}
