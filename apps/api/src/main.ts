import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/api-error.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new ApiErrorFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Paper Preparation API')
    .setDescription('API for managing conference paper preparation')
    .setVersion('0.1.0')
    .addCookieAuth(process.env.SESSION_COOKIE_NAME || 'paper_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(Number(process.env.PORT || 3001), '127.0.0.1');
}

void bootstrap();
