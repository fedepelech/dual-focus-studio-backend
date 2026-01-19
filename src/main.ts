import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(); // Enable CORS for React frontend
  app.setGlobalPrefix('api'); // Set global prefix to /api
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
