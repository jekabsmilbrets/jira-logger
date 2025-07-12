import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

describe('ReadableTimePipe', () => {
  it('create an instance', () => {
    const pipe: ReadableTimePipe = new ReadableTimePipe();
    expect(pipe).toBeTruthy();
  });
});
