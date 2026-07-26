import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LoaderState } from './loader-state';

describe('Core Services loader-state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should report true when any loader is true', async () => {
    TestBed.configureTestingModule({
      providers: [LoaderState],
    });
    const service = TestBed.inject(LoaderState);
    const a = signal(false);
    const b = signal(false);

    service.addLoader(a.asReadonly(), 'a');
    service.addLoader(b.asReadonly(), 'b');

    vi.advanceTimersByTime(60);
    await Promise.resolve();
    expect(service.isLoading()).toBe(false);

    b.set(true);
    vi.advanceTimersByTime(60);
    await Promise.resolve();
    expect(service.isLoading()).toBe(true);

    b.set(false);
    vi.advanceTimersByTime(60);
    await Promise.resolve();
    expect(service.isLoading()).toBe(false);
  });

  it('rejects duplicate loader names', () => {
    TestBed.configureTestingModule({ providers: [LoaderState] });
    const service = TestBed.inject(LoaderState);
    const loader = signal(false).asReadonly();

    service.addLoader(loader, 'duplicate');

    expect(() => service.addLoader(loader, 'duplicate')).toThrow('Loader with name "duplicate" already exists.');
  });
});
