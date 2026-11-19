import { spawnSync } from 'node:child_process';
import { constants, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(args) {
  const result = spawnSync(pnpm, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  copyFileSync(
    new URL('../.env.example', import.meta.url),
    new URL('../.env', import.meta.url),
    constants.COPYFILE_EXCL,
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}

run(['install', '--frozen-lockfile']);
run(['db:up']);
run(['db:migrate']);
if (process.argv.includes('--dev')) run(['dev']);
