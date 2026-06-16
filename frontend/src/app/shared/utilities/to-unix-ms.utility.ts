import type { UnixMs } from '@shared/types/unix-ms.type';

export const toUnixMs: <T extends UnixMs = number>(date: Date, mode?: 'number' | 'string') => T = <T extends UnixMs = number>(
  date: Date,
  mode: 'number' | 'string' = 'number',
): T => {
  const unixMs: number = date.getTime();

  return (mode === 'string' ? String(unixMs) : unixMs) as T;
};
