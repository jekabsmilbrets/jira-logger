import { WritableSignal } from '@angular/core';

import { Observable } from 'rxjs';

import { RequestGateWaiter } from '@core/interfaces/request-gate-waiter.interface';

export class RequestGate {
  private locked: boolean = false;
  private readonly waiters: RequestGateWaiter[] = [];

  public waitForTurn(
    isLoadingSignal: WritableSignal<boolean>,
  ): Observable<VoidFunction> {
    return new Observable<VoidFunction>((subscriber) => {
      const waiter: RequestGateWaiter = {
        cancelled: false,
        grantTurn: () => {
          if (waiter.cancelled || subscriber.closed) {
            this.scheduleNextWaiter();
            return;
          }

          let released: boolean = false;

          this.locked = true;
          isLoadingSignal.set(true);
          subscriber.next(() => {
            if (released) {
              return;
            }

            released = true;
            isLoadingSignal.set(false);
            this.scheduleNextWaiter();
          });
          subscriber.complete();
        },
      };

      if (!this.locked) {
        waiter.grantTurn();
        return;
      }

      this.waiters.push(waiter);

      return () => {
        waiter.cancelled = true;
        this.removeWaiter(waiter);
      };
    });
  }

  private scheduleNextWaiter(): void {
    const nextWaiter: RequestGateWaiter | undefined = this.waiters.shift();

    if (!nextWaiter) {
      this.locked = false;
      return;
    }

    queueMicrotask(() => {
      nextWaiter.grantTurn();
    });
  }

  private removeWaiter(
    waiter: RequestGateWaiter,
  ): void {
    const waiterIndex: number = this.waiters.indexOf(waiter);

    if (waiterIndex >= 0) {
      this.waiters.splice(waiterIndex, 1);
    }
  }
}
