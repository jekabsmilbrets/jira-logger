// @ts-check

import eslint from '@eslint/js';
import angular from 'angular-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

/**
 * ESLint Flat Config for Angular + TypeScript
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...angular.configs.tsRecommended,
  {
    files: ['**/*.ts'],
    processor: angular.processInlineTemplates,
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'warn',
        {
          type: 'attribute',
          prefix: ['app', 'tasks', 'shared', 'settings', 'report', 'layout'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'warn',
        {
          type: 'element',
          prefix: ['app', 'tasks', 'shared', 'settings', 'report', 'layout'],
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-inject': 'off',
      'no-underscore-dangle': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^@angular/'],
            ['^(?!@(?:angular|environments|core|shared|tasks|report|layout|settings)/)@?\\w'],
            ['^@environments/'],
            ['^@core/'],
            ['^@shared/'],
            ['^@tasks/'],
            ['^@report/'],
            ['^@layout/'],
            ['^@settings/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
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
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  }
);
