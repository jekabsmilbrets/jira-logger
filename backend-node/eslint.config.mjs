import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import multilineParameters from './eslint-rules/multiline-parameters.mjs';

export default defineConfig(
  globalIgnores(['dist/**', '.validation/**']),
  {
    files: ['**/*.{ts,js,mjs}'],
    extends: [eslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, tseslint.configs.stylistic],
    plugins: {
      '@stylistic': stylistic,
      local: { rules: { 'multiline-parameters': multilineParameters } },
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'local/multiline-parameters': 'error',
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-curly-newline': ['error', { ObjectExpression: { minProperties: 1, consistent: false } }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
      '@stylistic/comma-dangle': ['error', { functions: 'always-multiline' }],
      curly: ['error', 'all'],
      '@stylistic/curly-newline': ['error', {
        multiline: true,
        consistent: true,
        IfStatementConsequent: 'always',
        IfStatementAlternative: 'always',
      }],
      '@stylistic/padding-line-between-statements': ['error',
        { blankLine: 'always', prev: '*', next: ['block-like', 'class'] },
        { blankLine: 'always', prev: ['block-like', 'class'], next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'no-underscore-dangle': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^node:'],
            ['^(?!@(?:application|database|features|http|logging|shared|time)/)@?\\w'],
            ['^@application/'],
            ['^@database/'],
            ['^@features/'],
            ['^@http/'],
            ['^@logging/'],
            ['^@shared/'],
            ['^@time/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-member-accessibility': ['error', {
        accessibility: 'explicit',
        overrides: { constructors: 'off' },
      }],
      '@typescript-eslint/consistent-generic-constructors': ['error', 'type-annotation'],
      '@typescript-eslint/typedef': [
        'error',
        {
          memberVariableDeclaration: true,
          variableDeclaration: true,
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/typedef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
