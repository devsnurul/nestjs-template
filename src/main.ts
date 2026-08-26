import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env/index';
import helmet from 'helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './lib/exception-handler/index';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // cookie parser
  app.use(cookieParser());

  // security headers
  app.use(helmet());

  app.set('trust proxy', 1);

  // static repository
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // api prefix to the path
  app.setGlobalPrefix('api');

  // versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Logging middleware
  const loggingMiddleware = new LoggingMiddleware();
  app.use(loggingMiddleware.use.bind(loggingMiddleware));

  // interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new GlobalExceptionFilter());

  // graceful shutdown
  app.enableShutdownHooks();

  await app.listen(env.port);
}
void bootstrap();
