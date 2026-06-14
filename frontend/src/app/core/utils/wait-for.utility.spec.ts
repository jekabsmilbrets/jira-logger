import { signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { RequestGate, waitForTurn } from './wait-for.utility';

describe('Core Utils wait-for.utility', () => {
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
});
