import { createHash } from 'node:crypto';
import { format } from 'prettier';
import { spawnSync } from 'node:child_process';
import {
  cp,
  lstat,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
  defineForgeConfig,
  type ForgeConfig,
} from '../packages/config/src/define.ts';
import {
  featureIds,
  featureRegistry,
  plannedTemplates,
  templateIds,
  templateRegistry,
  type FeatureId,
  type TemplateId,
} from '../packages/config/src/templates.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const directories = [
  '.ai',
  '.github',
  'apps',
  'docs',
  'packages',
  'tests',
  'tooling',
];
const files = [
  '.env.example',
  '.gitignore',
  '.node-version',
  '.prettierignore',
  '.prettierrc.json',
  'AGENTS.md',
  'README.md',
  'compose.yaml',
  'eslint.config.mjs',
  'forge.config.ts',
  'package.json',
  'playwright.config.ts',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'turbo.json',
  'vitest.config.mjs',
];
const ignored = new Set([
  '.git',
  '.next',
  '.turbo',
  '.forge-local',
  'dist',
  'node_modules',
  'test-results',
  'playwright-report',
  'coverage',
]);
const help = `pnpm forge init <directory> [--template ${templateIds.join('|')}] [--name <project name>]
pnpm forge templates | features | validate | status | doctor | seed
pnpm forge add <${featureIds.join('|')}>`;

function isTemplate(value: string): value is TemplateId {
  return templateIds.some((id) => id === value);
}

function isFeature(value: string): value is FeatureId {
  return featureIds.some((id) => id === value);
}

function parseInit(args: string[]) {
  const [directory, ...options] = args;
  if (!directory || directory.startsWith('-'))
    throw new Error('Specify a project directory.');
  let template: TemplateId = 'saas';
  let name = basename(resolve(directory));
  const seen = new Set<string>();

  for (let index = 0; index < options.length; index += 2) {
    const flag = options[index];
    const value = options[index + 1];
    if (!flag || !value || value.startsWith('--') || seen.has(flag))
      throw new Error('Each option needs one value.');
    seen.add(flag);
    if (flag === '--template' && isTemplate(value)) template = value;
    else if (flag === '--name') name = value.trim();
    else if (flag === '--template')
      throw new Error(`Unsupported template: ${value}.`);
    else throw new Error(`Unknown option: ${flag}.`);
  }

  return { directory, name, template };
}

async function assertEmpty(target: string) {
  const entry = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (entry && (!entry.isDirectory() || (await readdir(target)).length)) {
    throw new Error(
      `Destination already exists and is not an empty directory: ${target}`,
    );
  }
}

async function init(args: string[]) {
  const { directory, name, template } = parseInit(args);
  const targetPath = resolve(directory);
  const parent = await realpath(dirname(targetPath));
  const target = join(parent, basename(targetPath));
  const source = await realpath(root);
  const firstSegment = relative(source, target).split(/[\\/]/)[0];
  if (firstSegment && directories.includes(firstSegment))
    throw new Error('Choose a directory outside the Forge source folders.');

  const config = defineForgeConfig({
    project: {
      name,
      description: 'برنامهٔ فارسی ساخته‌شده با فورج',
      symbol: Array.from(name)[0] ?? 'ف',
    },
    template,
  });
  await assertEmpty(target);
  const stage = await mkdtemp(join(parent, '.forge-init-'));
  try {
    for (const name of [...directories, ...files]) {
      await cp(join(source, name), join(stage, name), {
        recursive: true,
        filter: async (entry) => {
          const name = basename(entry);
          if (
            ignored.has(name) ||
            (name.startsWith('.env') && name !== '.env.example') ||
            name.startsWith('.forge-init-') ||
            name.endsWith('.tsbuildinfo') ||
            name === 'next-env.d.ts' ||
            relative(source, entry).replaceAll('\\', '/') ===
              'apps/api/src/generated'
          )
            return false;
          return !(await lstat(entry)).isSymbolicLink();
        },
      });
    }
    const generated = `import { defineForgeConfig } from './packages/config/src/define.ts';\n\nexport default defineForgeConfig(${JSON.stringify({ project: config.project, template }, null, 2)});\n`;
    await writeFile(
      join(stage, 'forge.config.ts'),
      await format(generated, { parser: 'typescript', singleQuote: true }),
    );
    const contractPath = join(stage, 'packages/api-client/openapi.json');
    const contract = JSON.parse(await readFile(contractPath, 'utf8')) as {
      info: { title: string; description: string };
    };
    contract.info.title = config.project.name;
    contract.info.description = config.project.description;
    await writeFile(contractPath, JSON.stringify(contract, null, 2) + '\n');

    const composePath = join(stage, 'compose.yaml');
    const suffix = createHash('sha256')
      .update(target)
      .digest('hex')
      .slice(0, 8);
    const composeName = `forge-${basename(target)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 24)}-${suffix}`;
    await writeFile(
      composePath,
      (await readFile(composePath, 'utf8')).replace(
        /^name: .+$/m,
        `name: ${composeName}`,
      ),
    );
    const git = spawnSync(
      'git',
      ['init', '--quiet', '--template=', '--initial-branch=main', stage],
      {
        encoding: 'utf8',
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([name]) => !name.startsWith('GIT_'),
          ),
        ),
      },
    );
    if (git.status !== 0)
      throw new Error(
        `Unable to initialize Git in the new project: ${git.error?.message ?? git.stderr.trim()}`,
      );
    await assertEmpty(target);
    await rename(stage, target);
    console.log(`Created ${templateRegistry[template].label} in ${target}.`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function currentConfig(): Promise<ForgeConfig> {
  const configuration = await import(
    pathToFileURL(join(root, 'forge.config.ts')).href
  );
  return defineForgeConfig(configuration.default);
}

function literalProperty(object: ts.ObjectLiteralExpression, name: string) {
  const matching = object.properties.filter(
    (entry) =>
      entry.name
        ?.getText(object.getSourceFile())
        .replace(/^['"]|['"]$/g, '') === name,
  );
  const [entry] = matching;
  if (matching.length > 1 || (entry && !ts.isPropertyAssignment(entry)))
    throw new Error('Edit the feature settings in forge.config.ts directly.');
  return entry;
}

function editableObject(
  node: ts.Expression | undefined,
): ts.ObjectLiteralExpression {
  if (
    !node ||
    !ts.isObjectLiteralExpression(node) ||
    node.properties.some((entry) => {
      return (
        ts.isSpreadAssignment(entry) ||
        (entry.name && ts.isComputedPropertyName(entry.name))
      );
    })
  )
    throw new Error('Edit the feature settings in forge.config.ts directly.');
  return node;
}

async function addFeature(id: string) {
  if (!isFeature(id)) throw new Error(`Unsupported feature: ${id}.`);
  const config = await currentConfig();
  if (config.features[id]) {
    console.log(`${id} is already enabled.`);
    return;
  }
  const path = join(root, 'forge.config.ts');
  const before = await readFile(path, 'utf8');
  const source = ts.createSourceFile(
    path,
    before,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(ts.isExportAssignment);
  const call = declaration?.expression;
  if (
    !call ||
    !ts.isCallExpression(call) ||
    call.expression.getText(source) !== 'defineForgeConfig'
  ) {
    throw new Error('Edit the feature settings in forge.config.ts directly.');
  }
  const object = editableObject(call.arguments[0]);
  const features = literalProperty(object, 'features');
  const featureObject = features
    ? editableObject(features.initializer)
    : undefined;
  const existing = featureObject
    ? literalProperty(featureObject, id)
    : undefined;
  if (existing && existing.initializer.kind !== ts.SyntaxKind.FalseKeyword) {
    throw new Error('Edit the feature settings in forge.config.ts directly.');
  }
  const start =
    existing?.initializer.getStart(source) ??
    (featureObject ?? object).getStart(source) + 1;
  const end = existing?.initializer.end ?? start;
  const addition = existing
    ? 'true'
    : featureObject
      ? `\n    ${id}: true,`
      : `\n  features: { ${id}: true },`;
  const stage = await mkdtemp(join(root, '.forge-init-'));
  try {
    const candidate = join(stage, 'forge.config.ts');
    await writeFile(
      candidate,
      before.slice(0, start) + addition + before.slice(end),
    );
    if ((await readFile(path, 'utf8')) !== before)
      throw new Error('forge.config.ts changed. Retry the command.');
    await rename(candidate, path);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  console.log(
    `Enabled ${id}. Restart the applications to load the updated configuration.`,
  );
}

function command(executable: string, args: string[]) {
  return spawnSync(executable, args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}

async function run([action = '--help', ...args]: string[]) {
  if (action === 'init') return init(args);
  if (action === 'add' && args.length === 1) return addFeature(args[0]!);
  if (args.length) throw new Error(help);
  if (action === '--help' || action === 'help') {
    console.log(help);
    return;
  }
  if (action === 'templates') {
    for (const id of templateIds)
      console.log(`${id}: ${templateRegistry[id].label} (implemented)`);
    for (const label of plannedTemplates) console.log(`${label} (planned)`);
    return;
  }
  if (action === 'features') {
    for (const id of featureIds) console.log(`${id}: ${featureRegistry[id]}`);
    return;
  }

  const config = await currentConfig();
  switch (action) {
    case 'validate':
      console.log(`Valid Forge configuration for ${config.project.name}.`);
      break;
    case 'status':
      console.log(
        `${templateRegistry[config.template].label} (${config.template})`,
      );
      for (const id of featureIds)
        console.log(`${id}: ${config.features[id] ? 'enabled' : 'disabled'}`);
      console.log(
        'Implementation and verification status: docs/ROADMAP.md and .ai/STATE.md',
      );
      break;
    case 'doctor': {
      const checks = [
        command('node', ['--version']),
        command('git', ['--version']),
        command('pnpm', ['--version']),
        command('docker', ['compose', 'version']),
      ];
      if (checks.some(({ status }) => status !== 0))
        throw new Error('Node, Git, pnpm and Docker Compose are required.');
      if (
        command('docker', ['info', '--format', '{{.ServerVersion}}']).status !==
        0
      ) {
        throw new Error('Docker is installed but its daemon is unavailable.');
      }
      const health = await fetch(
        `http://127.0.0.1:${config.api.port}/api/v1/health`,
        {
          signal: AbortSignal.timeout(2000),
        },
      ).catch(() => undefined);
      const ready = health?.ok
        ? ((await health.json().catch(() => null)) as {
            database?: string;
          } | null)
        : null;
      console.log(
        ready?.database === 'ready'
          ? 'Local API and database are ready.'
          : 'Local API or database is not ready.',
      );
      console.log('Tool commands and Forge configuration are valid.');
      break;
    }
    case 'seed': {
      if (process.env.NODE_ENV === 'production')
        throw new Error('Demo seeding is disabled in production.');
      const build = command('pnpm', [
        'exec',
        'turbo',
        'run',
        'build',
        '--filter=@forge/api',
      ]);
      if (build.status !== 0) throw new Error('The API build failed.');
      if (command('pnpm', ['--filter', '@forge/api', 'seed']).status !== 0)
        throw new Error('Demo seeding failed.');
      break;
    }
    default:
      throw new Error(help);
  }
}

run(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
