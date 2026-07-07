import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { SettingsChangeSaveService } from '@settings/services/settings-change-save.service';

describe('SettingsChangeSaveService', () => {
  const settingsServiceMock = {
    update: vi.fn(),
    list: vi.fn(),
  };
  const matSnackBarMock = {
    open: vi.fn(),
  };

  beforeEach(() => {
    settingsServiceMock.update.mockReset();
    settingsServiceMock.update.mockImplementation((setting: Setting) => of(setting));
    settingsServiceMock.list.mockReset();
    settingsServiceMock.list.mockReturnValue(of([]));
    matSnackBarMock.open.mockReset();

    TestBed.configureTestingModule({
      providers: [
        SettingsChangeSaveService,
        { provide: SettingsService, useValue: settingsServiceMock },
        { provide: MatSnackBar, useValue: matSnackBarMock },
      ],
    });
  });

  it('updates changed settings, reloads once, and shows the success message', () => {
    const service = TestBed.inject(SettingsChangeSaveService);
    const changedSettings = [
      new Setting({ id: '11', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '12', name: JiraApiSettings.host, value: 'https://new.example' }),
    ];

    service.save({
      changedSettings,
      successMessage: 'Successfully saved JIRA API settings!',
    });

    expect(settingsServiceMock.update).toHaveBeenCalledTimes(2);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(1, changedSettings[0], true);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(2, changedSettings[1], true);
    expect(settingsServiceMock.list).toHaveBeenCalledTimes(1);
    expect(matSnackBarMock.open).toHaveBeenCalledWith(
      'Successfully saved JIRA API settings!',
      undefined,
      { duration: 5000 },
    );
  });

  it('does not show a success message when saving fails', () => {
    const service = TestBed.inject(SettingsChangeSaveService);
    settingsServiceMock.update.mockReturnValueOnce(throwError(() => new Error('save failed')));

    service.save({
      changedSettings: [new Setting({ id: '99', name: JiraApiSettings.enabled, value: 'false' })],
      successMessage: 'Successfully saved JIRA API settings!',
    });

    expect(settingsServiceMock.list).not.toHaveBeenCalled();
    expect(matSnackBarMock.open).not.toHaveBeenCalled();
  });
});
