import 'reflect-metadata';
import { forgeConfig, resolveApiPort } from '@forge/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { parseWebOrigin } from './auth/auth.guards.js';
import { configureApp } from './bootstrap.js';
import { describeApi } from './openapi.js';

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      process.loadEnvFile('../../.env');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production' && !process.env.WEB_ORIGIN) {
    throw new Error('WEB_ORIGIN is required in production.');
  }
  if (process.env.WEB_ORIGIN) parseWebOrigin(process.env.WEB_ORIGIN);

  const app = await NestFactory.create(AppModule.register(), {
    logger: new ConsoleLogger({ json: true }),
    abortOnError: false,
  });
  configureApp(app);
  app.enableShutdownHooks();

  if (forgeConfig.features.apiDocs && process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, () => describeApi(app));
  }

  await app.listen(
    resolveApiPort(forgeConfig, process.env.API_PORT),
    process.env.API_HOST ?? '127.0.0.1',
  );
}

void main().catch((error: unknown) => {
  const logger = new ConsoleLogger({ json: true });
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
