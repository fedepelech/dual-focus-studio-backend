import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configurar límites de body parser en Express
  app.use(express.json({ limit: '250mb' }));
  app.use(express.urlencoded({ limit: '250mb', extended: true }));

  app.enableCors(); // Habilitar CORS para el frontend React
  app.setGlobalPrefix('api'); // Prefijo global /api
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
