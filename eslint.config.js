import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['scripts/**/*.mjs', 'public/sw.js'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly', self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly' },
    },
  },
);
