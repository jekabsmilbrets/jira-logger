import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { waitForTurn } from './wait-for.utility';

describe('Core Utils wait-for.utility', () => {
  it('waits until loading is false and marks loading as true', async () => {
    const isLoadingSubject = new BehaviorSubject(true);
    const output = waitForTurn(isLoadingSubject.asObservable(), isLoadingSubject);

    const promise = firstValueFrom(output);
    isLoadingSubject.next(false);

    await expect(promise).resolves.toBe(false);
    expect(isLoadingSubject.getValue()).toBe(true);
  });
});
