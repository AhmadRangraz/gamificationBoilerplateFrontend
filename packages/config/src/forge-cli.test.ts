import { spawnSync } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { defineForgeConfig } from './define';

const root = process.cwd();
const cli = join(root, 'tooling', 'forge.mts');

function forge(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('presets resolve separate feature defaults and accept explicit overrides', () => {
  const project = { name: 'فورج', description: 'نمونه', symbol: 'ف' };
  expect(defineForgeConfig({ project }).features).toMatchObject({
    apiDocs: true,
    workspaceAdmin: true,
    marketplace: false,
    gamification: false,
  });
  expect(
    defineForgeConfig({ project, template: 'marketplace' }).features,
  ).toMatchObject({
    apiDocs: true,
    workspaceAdmin: false,
    marketplace: true,
    gamification: false,
  });
  expect(
    defineForgeConfig({
      project,
      template: 'marketplace',
      features: { workspaceAdmin: true, apiDocs: false, gamification: true },
    }).features,
  ).toMatchObject({
    apiDocs: false,
    workspaceAdmin: true,
    marketplace: true,
    gamification: true,
  });
});

test('Forge generates into an empty directory and excludes machine-local files', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'forge-cli-'));
  try {
    const empty = join(sandbox, 'market');
    await mkdir(empty);
    const result = forge(
      'init',
      empty,
      '--template',
      'marketplace',
      '--name',
      'بازار آبان',
    );
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(join(empty, 'forge.config.ts'), 'utf8')).toContain(
      "template: 'marketplace'",
    );
    expect(await readFile(join(empty, 'forge.config.ts'), 'utf8')).toContain(
      'بازار آبان',
    );
    await expect(access(join(empty, '.env.example'))).resolves.toBeUndefined();
    for (const entry of [
      '.env',
      '.forge-local',
      'node_modules',
      'apps/api/src/generated',
    ]) {
      await expect(access(join(empty, entry))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    }
    await expect(
      access(join(empty, 'pnpm-lock.yaml')),
    ).resolves.toBeUndefined();
  } finally {
    await rm(sandbox, { force: true, recursive: true });
  }
});

test('Forge preserves an existing project and rejects unsupported templates before writing', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'forge-cli-'));
  try {
    const file = join(sandbox, 'README.md');
    await writeFile(file, 'User-owned content');
    const result = forge('init', sandbox, '--template', 'saas');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not an empty directory');
    expect(await readFile(file, 'utf8')).toBe('User-owned content');
    const unavailable = join(sandbox, 'unlisted');
    expect(forge('init', unavailable, '--template', 'unlisted').status).toBe(1);
    await expect(access(unavailable)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(sandbox, { force: true, recursive: true });
  }
});
