import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/api/src/generated/**',
      'packages/api-client/src/schema.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['tooling/*.mjs'],
    languageOptions: { globals: { process: 'readonly', URL: 'readonly' } },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': next,
      'react-hooks': reactHooks,
    },
    settings: { next: { rootDir: 'apps/web/' } },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];
