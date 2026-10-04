import { cpSync } from 'node:fs';

cpSync(new URL('../src/features/maintenance/migrations/', import.meta.url), new URL('../dist/features/maintenance/migrations/', import.meta.url), { recursive: true });
