import { signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { RequestGate } from './request-gate.utility';
import { waitForTurn } from './wait-for.utility';

describe('Core Utils request-gate.utility', () => {
  it('queues turns and releases loading when the returned callback runs', async () => {
    const requestGate = new RequestGate();
    const isLoading = signal(false);
    const firstTurn = await firstValueFrom(waitForTurn(requestGate, isLoading));

    expect(isLoading()).toBe(true);

    const secondTurnPromise = firstValueFrom(waitForTurn(requestGate, isLoading));
    firstTurn();

    const secondTurn = await secondTurnPromise;
    expect(isLoading()).toBe(true);

    secondTurn();
    expect(isLoading()).toBe(false);
  });

  it('skips a cancelled dequeued waiter and grants the next queued turn', async () => {
    const requestGate = new RequestGate();
    const isLoading = signal(false);
    const firstTurn = await firstValueFrom(waitForTurn(requestGate, isLoading));
    let secondTurnGranted = false;

    const secondTurnSubscription = waitForTurn(requestGate, isLoading)
      .subscribe(() => {
        secondTurnGranted = true;
      });
    const thirdTurnPromise = firstValueFrom(waitForTurn(requestGate, isLoading));

    firstTurn();
    secondTurnSubscription.unsubscribe();
    await Promise.resolve();

    const thirdTurn = await thirdTurnPromise;

    expect(secondTurnGranted).toBe(false);
    expect(isLoading()).toBe(true);

    thirdTurn();
    expect(isLoading()).toBe(false);
  });
});
