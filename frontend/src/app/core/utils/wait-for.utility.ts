import { WritableSignal } from '@angular/core';

import { Observable } from 'rxjs';

import { RequestGate } from './request-gate.utility';

export const waitForTurn: (
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
) => Observable<VoidFunction> = (
  requestGate: RequestGate,
  isLoadingSignal: WritableSignal<boolean>,
): Observable<VoidFunction> => requestGate.waitForTurn(isLoadingSignal);
