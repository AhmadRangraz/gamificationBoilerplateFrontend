import { Test } from '@nestjs/testing';
import { configureApp } from './bootstrap.js';
import { AppModule } from './app.module.js';
import { describeApi } from './openapi.js';
import { PrismaService } from './prisma.service.js';

export async function exportOpenApi() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(true)],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  try {
    return describeApi(app);
  } finally {
    await app.close();
  }
}
