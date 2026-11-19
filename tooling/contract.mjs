import { readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import { exportOpenApi } from '../apps/api/dist/export-openapi.js';

const definition = await exportOpenApi();
const files = {
  'openapi.json': JSON.stringify(definition, null, 2) + '\n',
  'src/schema.ts': astToString(
    await openapiTS(definition, { alphabetize: true }),
  ),
};

for (const [name, content] of Object.entries(files)) {
  const file = new URL(`../packages/api-client/${name}`, import.meta.url);
  if (process.argv.includes('--check')) {
    if ((await readFile(file, 'utf8')) !== content) {
      throw new Error(`${name} is stale. Run pnpm contract:generate.`);
    }
  } else {
    await writeFile(file, content);
  }
}
