import type { WritableSignal } from '@angular/core';

import { catchError, finalize, type Observable, switchMap, throwError } from 'rxjs';

import { RequestGate } from './request-gate.utility';
import { waitForTurn } from './wait-for.utility';

export const runGatedRequest: <TValue>(
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
  request$: Observable<TValue>,
  onError?: (error: unknown) => Observable<TValue>,
) => Observable<TValue> = <TValue>(
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
  request$: Observable<TValue>,
  onError?: (error: unknown) => Observable<TValue>,
): Observable<TValue> => waitForTurn(
  requestGate,
  isLoadingSignal,
)
  .pipe(
    switchMap((release: VoidFunction) => request$
      .pipe(
        catchError((error: unknown) => {
          release();

          if (onError) {
            return onError(error);
          }

          return throwError(() => error);
        }),
        finalize(release),
      )),
  );
