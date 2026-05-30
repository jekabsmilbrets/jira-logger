import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ErrorDialogService } from './error-dialog.service';

describe('Shared Services error-dialog.service', () => {
  it('opens dialog with disableClose', async () => {
    const matDialog = {
      open: vi.fn(() => ({ afterClosed: () => of(undefined) })),
    };

    await TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: matDialog }],
    });

    const service = TestBed.inject(ErrorDialogService);
    const result = await import('rxjs').then(({ firstValueFrom }) => firstValueFrom(service.openDialog({
      errorTitle: 'e',
      idbData: [],
    } as any)));

    expect(result).toBeUndefined();
    expect(matDialog.open).toHaveBeenCalledOnce();
    expect((matDialog.open as any).mock.calls[0][1]).toMatchObject({ disableClose: true });
  });
});
