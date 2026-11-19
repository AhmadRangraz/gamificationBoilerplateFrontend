import { defineConfig } from 'prisma/config';

if (process.env.NODE_ENV !== 'production') {
  try {
    process.loadEnvFile('../../.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
