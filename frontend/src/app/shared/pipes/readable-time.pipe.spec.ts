import { ReadableTimePipe } from './readable-time.pipe';

describe('Shared Pipes readable-time.pipe', () => {
  const pipe = new ReadableTimePipe();

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
