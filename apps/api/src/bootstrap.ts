import 'reflect-metadata';
import { apiPrefix } from '@forge/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  return app;
}
