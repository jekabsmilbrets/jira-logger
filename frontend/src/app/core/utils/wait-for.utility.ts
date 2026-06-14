import { WritableSignal } from '@angular/core';

import { Observable } from 'rxjs';

export class RequestGate {
  private locked: boolean = false;
  private readonly waiters: (() => void)[] = [];

  public waitForTurn(
    isLoadingSignal: WritableSignal<boolean>,
  ): Observable<VoidFunction> {
    return new Observable<VoidFunction>((subscriber) => {
      const grantTurn: () => void = () => {
        let released: boolean = false;

        this.locked = true;
        isLoadingSignal.set(true);
        subscriber.next(() => {
          if (released) {
            return;
          }

          released = true;
          isLoadingSignal.set(false);

          const nextWaiter: (() => void) | undefined = this.waiters.shift();

          if (nextWaiter) {
            queueMicrotask(nextWaiter);
            return;
          }

          this.locked = false;
        });
        subscriber.complete();
      };

      if (!this.locked) {
        grantTurn();
        return;
      }

      this.waiters.push(grantTurn);

      return () => {
        const waiterIndex: number = this.waiters.indexOf(grantTurn);

        if (waiterIndex >= 0) {
          this.waiters.splice(waiterIndex, 1);
        }
      };
    });
  }
}

export const waitForTurn: (
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
) => Observable<VoidFunction> = (
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
): Observable<VoidFunction> => requestGate.waitForTurn(isLoadingSignal);
