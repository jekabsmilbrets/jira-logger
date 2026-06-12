import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';

import { AreYouSureService } from './are-you-sure.service';

describe('Shared Services are-you-sure.service', () => {
  it('opens dialog and returns close stream', async () => {
    const matDialog = {
      open: vi.fn(() => ({ afterClosed: () => of(true) })),
    };

    await TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: matDialog }],
    });

    const service = TestBed.inject(AreYouSureService);
    const value = await import('rxjs').then(({ firstValueFrom }) => firstValueFrom(service.openDialog('x')));

    expect(matDialog.open).toHaveBeenCalledOnce();
    expect(value).toBe(true);
  });
});
