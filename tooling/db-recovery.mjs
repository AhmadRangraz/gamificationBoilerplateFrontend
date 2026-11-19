import { spawn } from 'node:child_process';
import console from 'node:console';
import { randomBytes } from 'node:crypto';
import { link, mkdtemp, open, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const [operation, archiveArgument, ...extra] = process.argv.slice(2);
if (
  !['backup', 'restore-verify'].includes(operation) ||
  !archiveArgument ||
  extra.length > 0
) {
  console.error(
    'Usage: pnpm db:backup <archive-path> or pnpm db:restore-verify <archive-path>',
  );
  process.exit(1);
}

function postgres(
  label,
  command,
  args = [],
  { input = 'ignore', output = 'inherit' } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'db',
        'sh',
        '-eu',
        '-c',
        command,
        label,
        ...args,
      ],
      { stdio: [input, output, 'inherit'] },
    );
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (${signal ?? `exit ${code}`}).`));
    });
  });
}

async function backup(archive) {
  const temporaryDirectory = await mkdtemp(
    join(dirname(archive), '.forge-backup-'),
  );
  const temporaryArchive = join(temporaryDirectory, 'backup.dump');
  try {
    const file = await open(temporaryArchive, 'wx', 0o600);
    try {
      await postgres(
        'pg_dump',
        'exec pg_dump --no-password --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-privileges',
        [],
        { output: file.fd },
      );
      await file.sync();
    } finally {
      await file.close();
    }
    // Publishing with a hard link makes a completed archive visible without replacing an existing path.
    await link(temporaryArchive, archive);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.log(`Backup written to ${archive}.`);
}

const schemaCheck = `
DO $$
BEGIN
  IF to_regclass('public."Account"') IS NULL
    OR to_regclass('public."PointEntry"') IS NULL
    OR to_regclass('public._prisma_migrations') IS NULL THEN
    RAISE EXCEPTION 'FORGE schema missing from restored database';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public._prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public._prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Restored database has missing or incomplete migrations';
  END IF;
END $$;
`;

async function restoreVerify(archive) {
  const database = `forge_restore_${randomBytes(12).toString('hex')}`;
  const file = await open(archive, 'r');
  try {
    if (!(await file.stat()).isFile())
      throw new Error('Expected a regular archive file.');
    await postgres(
      'createdb',
      'exec createdb --no-password --username "$POSTGRES_USER" --template template0 -- "$1"',
      [database],
    );
    try {
      console.log(`Restoring into disposable database ${database}.`);
      await postgres(
        'pg_restore',
        'exec pg_restore --no-password --username "$POSTGRES_USER" --dbname "$1" --exit-on-error --single-transaction --no-owner --no-privileges',
        [database],
        { input: file.fd },
      );
      await postgres(
        'check restored schema',
        'exec psql --no-password --username "$POSTGRES_USER" --dbname "$1" --no-psqlrc --set ON_ERROR_STOP=1 --quiet --command "$2"',
        [database, schemaCheck],
      );
    } finally {
      await postgres(
        `dropdb ${database}`,
        'exec dropdb --no-password --username "$POSTGRES_USER" --if-exists -- "$1"',
        [database],
      );
    }
  } finally {
    await file.close();
  }
  console.log(
    'Archive restored and verified in a disposable database, which was removed.',
  );
}

try {
  const archive = resolve(archiveArgument);
  if (operation === 'backup') await backup(archive);
  else await restoreVerify(archive);
} catch (error) {
  console.error(`Database ${operation} failed: ${error.message}`);
  process.exitCode = 1;
}
