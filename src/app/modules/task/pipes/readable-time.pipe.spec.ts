import { ReadableTimePipe } from './readable-time.pipe';

describe('ReadableTimePipe', () => {
  it('create an instance', () => {
    const pipe = new ReadableTimePipe();
    expect(pipe).toBeTruthy();
  });
});
