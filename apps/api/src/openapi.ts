import { forgeConfig } from '@forge/config';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function describeApi(app: INestApplication) {
  const metadata = new DocumentBuilder()
    .setTitle(forgeConfig.project.name)
    .setDescription(forgeConfig.project.description)
    .setVersion('1')
    .addCookieAuth('forge_session', { type: 'apiKey' }, 'session')
    .build();

  return SwaggerModule.createDocument(app, metadata, {
    operationIdFactory: (_controller, method) => method,
  });
}
