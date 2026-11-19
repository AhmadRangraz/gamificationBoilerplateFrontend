import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function dbClient() {
  if (!process.env.DATABASE_URL) process.loadEnvFile('.env');
  const { PrismaService } = await import('../apps/api/dist/prisma.service.js');
  return new PrismaService();
}

export async function messagesFor(email: string) {
  const directory = process.env.FORGE_TEST_MAIL_DIR!;
  const entries = await readdir(directory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    },
  );
  const messages = await Promise.all(
    entries
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        const path = join(directory, file);
        const content = await readFile(path, 'utf8').catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return '{}';
            throw error;
          },
        );
        const message = JSON.parse(content) as {
          to?: string;
          kind?: string;
          code?: string;
          transport?: string;
        };
        return { path, ...message };
      }),
  );
  return messages.filter((message) => message.to === email);
}
