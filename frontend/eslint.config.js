// @ts-check

const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * ESLint Flat Config for Angular + TypeScript
 */
module.exports = tseslint.config(
  // Lint for TypeScript files
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
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
      '@typescript-eslint/no-explicit-any': 'warn', // Change to 'error' to strictly forbid
      '@typescript-eslint/typedef': [
        'warn',
        {
          variableDeclaration: true
        },
      ],
    },
  },
  // Override: Looser rules for test files
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off', // Allow empty functions in tests
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
      '@typescript-eslint/typedef': 'off', // Allow no type annotations in tests
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow '!'
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow inferred return types
    },
  },
  // Lint for Angular HTML templates
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
