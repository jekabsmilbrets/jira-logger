// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

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
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',
      'no-underscore-dangle': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/typedef': [
        'warn',
        {
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
