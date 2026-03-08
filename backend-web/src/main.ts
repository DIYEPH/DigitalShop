import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS') ?? 'http://localhost:4000';
  const trustProxyHops = Number(config.get<string>('TRUST_PROXY_HOPS') ?? 1);

  app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(config.get<string>('PORT') ?? 3002);
  await app.listen(port);
}

void bootstrap();
