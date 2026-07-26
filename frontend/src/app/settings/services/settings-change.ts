import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { forkJoin, type Observable, switchMap, take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { Settings } from '@core/services/settings';

import { Tag } from '@shared/models/tag.model';
import { Tags } from '@shared/services/tags';

import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';

const tagSuccessMessages: Record<TagManagementCommand['action'], string> = {
  create: 'Successfully created tag!',
  update: 'Successfully updated tag!',
  delete: 'Successfully deleted tag!',
};

@Service()
export class SettingsChange {
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly settingsService: Settings = inject(Settings);
  private readonly tagsService: Tags = inject(Tags);

  public saveSettings(
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
        next: () => this.openSuccess(saveEvent.successMessage),
        error: () => undefined,
      });
  }

  public saveTag(
    command: TagManagementCommand,
  ): void {
    this.createTagRequest(command)
      .pipe(take(1))
      .subscribe({
        next: () => this.openSuccess(tagSuccessMessages[command.action]),
        error: () => undefined,
      });
  }

  private createTagRequest(
    command: TagManagementCommand,
  ): Observable<Tag | void> {
    switch (command.action) {
      case 'create':
        return this.tagsService.create(command.tag);
      case 'update':
        return this.tagsService.update(command.tag);
      case 'delete':
        return this.tagsService.delete(command.tag);
    }
  }

  private openSuccess(
    message: string,
  ): void {
    this.matSnackBar.open(
      message,
      undefined,
      { duration: 5000 },
    );
  }
}
