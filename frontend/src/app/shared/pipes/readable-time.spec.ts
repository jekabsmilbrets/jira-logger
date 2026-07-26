import { ReadableTime } from './readable-time';

describe('Shared Pipes readable-time', () => {
  const pipe = new ReadableTime();

  it('formats seconds under one minute', () => {
    expect(pipe.transform(42)).toBe('42s');
  });

  it('formats hours/minutes and optional seconds', () => {
    expect(pipe.transform(3661)).toBe('1h 1m');
    expect(pipe.transform(3661, true)).toBe('1h 1m 1s');
  });

  it('handles NaN', () => {
    expect(pipe.transform(Number.NaN)).toBe('0s');
  });
});
