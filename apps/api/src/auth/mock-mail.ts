import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AccountActionKind } from '../generated/prisma/client.js';

interface AccountMessage {
  to: string;
  kind: AccountActionKind;
  code: string;
  expiresAt: Date;
}

@Injectable()
export class MockMail {
  assertEnabled() {
    if (
      process.env.NODE_ENV === 'production' ||
      (process.env.FORGE_MAIL_MODE ?? 'mock') !== 'mock'
    ) {
      throw new ServiceUnavailableException('سرویس ایمیل در دسترس نیست.');
    }
  }

  async send(message: AccountMessage) {
    this.assertEnabled();
    const directory = resolve(
      process.env.FORGE_MOCK_MAIL_DIR ?? '../../.forge-local/mail',
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = resolve(directory, randomUUID());
    const temporaryFile = `${path}.tmp`;
    try {
      await writeFile(
        temporaryFile,
        JSON.stringify({ transport: 'mock', ...message }) + '\n',
        {
          flag: 'wx',
          mode: 0o600,
        },
      );
      await rename(temporaryFile, `${path}.json`);
    } finally {
      await rm(temporaryFile, { force: true });
    }
  }
}
