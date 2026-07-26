import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';
import { Settings } from '@core/services/settings';

import { Tag } from '@shared/models/tag.model';
import { Tags } from '@shared/services/tags';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';
import { SettingsChange } from '@settings/services/settings-change';

describe('Settings Service SettingsChange', () => {
  let service: SettingsChange;
  let settingsServiceMock: {
    update: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let tagsServiceMock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let matSnackBarMock: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    settingsServiceMock = {
      update: vi.fn((setting: Setting) => of(setting)),
      list: vi.fn(() => of([])),
    };
    tagsServiceMock = {
      create: vi.fn((tag: Tag) => of(tag)),
      update: vi.fn((tag: Tag) => of(tag)),
      delete: vi.fn(() => of(undefined)),
    };
    matSnackBarMock = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SettingsChange,
        { provide: Settings, useValue: settingsServiceMock },
        { provide: Tags, useValue: tagsServiceMock },
        { provide: MatSnackBar, useValue: matSnackBarMock },
      ],
    });

    service = TestBed.inject(SettingsChange);
  });

  it('updates changed settings, reloads once, and shows the success message', () => {
    const changedSettings = [
      new Setting({ id: '11', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '12', name: JiraApiSettings.host, value: 'https://new.example' }),
    ];

    service.saveSettings({
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

  it('does not show a success message when saving settings fails', () => {
    settingsServiceMock.update.mockReturnValueOnce(throwError(() => new Error('save failed')));

    service.saveSettings({
      changedSettings: [new Setting({ id: '99', name: JiraApiSettings.enabled, value: 'false' })],
      successMessage: 'Successfully saved JIRA API settings!',
    });

    expect(settingsServiceMock.list).not.toHaveBeenCalled();
    expect(matSnackBarMock.open).not.toHaveBeenCalled();
  });

  it('routes tag commands to tag requests and opens the matching success snackbar', () => {
    const createEvent: TagManagementCommand = {
      action: 'create',
      tag: new Tag({ name: 'New Tag' }),
    };
    const updateEvent: TagManagementCommand = {
      action: 'update',
      tag: new Tag({ id: 'tag-1', name: 'Updated Tag' }),
    };
    const deleteEvent: TagManagementCommand = {
      action: 'delete',
      tag: new Tag({ id: 'tag-1', name: 'Updated Tag' }),
    };

    service.saveTag(createEvent);
    service.saveTag(updateEvent);
    service.saveTag(deleteEvent);

    expect(tagsServiceMock.create).toHaveBeenCalledWith(createEvent.tag);
    expect(tagsServiceMock.update).toHaveBeenCalledWith(updateEvent.tag);
    expect(tagsServiceMock.delete).toHaveBeenCalledWith(deleteEvent.tag);
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully created tag!', undefined, { duration: 5000 });
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully updated tag!', undefined, { duration: 5000 });
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully deleted tag!', undefined, { duration: 5000 });
  });

  it('does not open a success snackbar when the tag request fails', () => {
    tagsServiceMock.create.mockReturnValueOnce(throwError(() => new Error('save failed')));

    service.saveTag({
      action: 'create',
      tag: new Tag({ name: 'New Tag' }),
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(matSnackBarMock.open).not.toHaveBeenCalled();
  });
});
