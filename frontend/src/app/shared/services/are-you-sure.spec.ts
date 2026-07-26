import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';

import { AreYouSure } from './are-you-sure';

describe('Shared Services are-you-sure', () => {
  it('opens dialog and returns close stream', async () => {
    const matDialog = {
      open: vi.fn(() => ({ afterClosed: () => of(true) })),
    };

    await TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: matDialog }],
    });

    const service = TestBed.inject(AreYouSure);
    const value = await import('rxjs').then(({ firstValueFrom }) => firstValueFrom(service.openDialog('x')));

    expect(matDialog.open).toHaveBeenCalledOnce();
    expect(value).toBe(true);
  });
});
