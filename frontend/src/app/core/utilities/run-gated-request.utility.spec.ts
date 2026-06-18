import { signal } from '@angular/core';

import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RequestGate } from './request-gate.utility';
import { runGatedRequest } from './run-gated-request.utility';

describe('run-gated-request.utility', () => {
  it('passes through successful requests and releases the loading state', async () => {
    const isLoadingSignal = signal(false);
    const result = await firstValueFrom(
      runGatedRequest(new RequestGate(), isLoadingSignal, of('ok')),
    );

    expect(result).toBe('ok');
    expect(isLoadingSignal()).toBe(false);
  });

  it('delegates request errors to the provided error handler', async () => {
    const isLoadingSignal = signal(false);
    const onError = vi.fn(() => of('recovered'));

    const result = await firstValueFrom(
      runGatedRequest(
        new RequestGate(),
        isLoadingSignal,
        throwError(() => new Error('boom')),
        onError,
      ),
    );

    expect(result).toBe('recovered');
    expect(onError).toHaveBeenCalledOnce();
    expect(isLoadingSignal()).toBe(false);
  });

  it('rethrows request errors when no error handler is provided', async () => {
    const isLoadingSignal = signal(false);

    await expect(firstValueFrom(
      runGatedRequest(
        new RequestGate(),
        isLoadingSignal,
        throwError(() => new Error('boom')),
      ),
    )).rejects.toThrow('boom');

    expect(isLoadingSignal()).toBe(false);
  });
});
