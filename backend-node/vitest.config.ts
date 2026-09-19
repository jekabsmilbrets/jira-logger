import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

function source(
  directory: string,
): string {
  return resolve(process.cwd(), 'src', directory);
}

export default defineConfig({
  resolve: {
    alias: {
      '@application': source('application'),
      '@server': resolve(process.cwd(), 'src/server.ts'),
      '@database': source('database'),
      '@features': source('features'),
      '@http': source('http'),
      '@logging': source('logging'),
      '@shared': source('shared'),
      '@time': source('time')
    }
  },
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts']
  }
});
