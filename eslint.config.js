import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'rogue/**',
      'rogomatic/**',
      'emcurses/**',
      'public/**',
      'pnpm-lock.yaml',
      'package-lock.json',
    ],
  },
  {
    // Node tooling scripts (e.g. the pretrain driver) that also embed browser
    // code inside Playwright page.evaluate() callbacks — provide both global sets.
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
        document: 'readonly',
        indexedDB: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
);
