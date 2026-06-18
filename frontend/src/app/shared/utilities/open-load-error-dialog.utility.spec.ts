import { signal } from '@angular/core';

import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { openLoadErrorDialog } from './open-load-error-dialog.utility';

describe('open-load-error-dialog.utility', () => {
  it('opens the error dialog with serialized error details and rethrows the error', async () => {
    const isLoadingSignal = signal(true);
    const setting = new Setting({ id: '1', name: 'theme', value: 'dark' });
    const openDialog = vi.fn(() => of(undefined));
    const error = new Error('boom');

    await expect(firstValueFrom(
      openLoadErrorDialog(
        async () => ({ openDialog } as any),
        isLoadingSignal,
        error,
        [setting],
      ),
    )).rejects.toThrow('boom');

    expect(isLoadingSignal()).toBe(false);
    expect(openDialog).toHaveBeenCalledWith({
      errorTitle: 'Error while doing db action :D',
      errorMessage: JSON.stringify(error),
      idbData: [setting],
    });
  });
});
