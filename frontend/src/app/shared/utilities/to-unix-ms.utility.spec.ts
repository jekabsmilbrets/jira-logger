import { toUnixMs } from './to-unix-ms.utility';

describe('Shared Utils to-unix-ms.util', () => {
  it('returns unix time in milliseconds as number by default', () => {
    const date = new Date('2024-01-01T10:20:30.456Z');

    expect(toUnixMs(date)).toBe(1704104430456);
  });

  it('returns unix time in milliseconds as string when requested', () => {
    const date = new Date('2024-01-01T10:20:30.456Z');

    expect(toUnixMs<string>(date, 'string')).toBe('1704104430456');
  });
});
