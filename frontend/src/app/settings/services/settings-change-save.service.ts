import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { forkJoin, switchMap, take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';

@Service()
export class SettingsChangeSaveService {
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly settingsService: SettingsService = inject(SettingsService);

  public save(
    saveEvent: SettingsSaveEvent,
  ): void {
    forkJoin(
      saveEvent.changedSettings.map(
        (setting: Setting) => this.settingsService.update(setting, true),
      ),
    )
      .pipe(
        take(1),
        switchMap(() => this.settingsService.list()),
        take(1),
      )
      .subscribe({
        next: () => this.matSnackBar.open(
          saveEvent.successMessage,
          undefined,
          { duration: 5000 },
        ),
        error: () => undefined,
      });
  }
}
