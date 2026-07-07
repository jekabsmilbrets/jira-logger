import { ChangeDetectionStrategy, Component, input, output, type Signal, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { UserSettingsConfiguratorComponent } from '@settings/components/user-settings-configurator/user-settings-configurator.component';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';
import { SettingsChangeSaveService } from '@settings/services/settings-change-save.service';
import { TagManagementSaveService } from '@settings/services/tag-management-save.service';
import { SettingsComponent } from '@settings/views/settings/settings.component';

@Component({
  selector: 'settings-report-configurator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class ReportConfiguratorStubComponent {
  public readonly disabled = input(false);
  public readonly reportSettings = input.required<ReportSettingsControlsState>();

  public readonly reportSettingsChange = output<ReportSettingsIntent>();
}

@Component({
  selector: 'settings-jira-api-configurator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class JiraApiConfiguratorStubComponent {
  public readonly disabled = input(false);
  public readonly settings = input<Setting[]>([]);

  public readonly settingsChange = output<SettingsSaveEvent>();
}

@Component({
  selector: 'settings-timezone-configurator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class UserSettingsConfiguratorStubComponent {
  public readonly disabled = input(false);
  public readonly settings = input<Setting[]>([]);

  public readonly settingsChange = output<SettingsSaveEvent>();
}

@Component({
  selector: 'settings-tag-management-configurator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class TagManagementConfiguratorStubComponent {
  public readonly disabled = input(false);
  public readonly tags = input<Tag[]>([]);
  public readonly tagChange = output<TagManagementCommand>();
}

const applyReportSettingsIntent = vi.fn<(intent: ReportSettingsIntent) => void>();

describe('Settings Views settings.component', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let reportService: ReportServiceStub;
  let settingsServiceMock: {
    settings: Signal<Setting[]>;
    update: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let tagsServiceMock: {
    tags: Signal<Tag[]>;
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let matSnackBarMock: {
    open: ReturnType<typeof vi.fn>;
  };
  let settingsChangeSaveServiceMock: {
    save: ReturnType<typeof vi.fn>;
  };
  let tagManagementSaveServiceMock: {
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    applyReportSettingsIntent.mockReset();

    settingsServiceMock = {
      settings: signal([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
        new Setting({ id: '4', name: JiraUserSettings.userTimeZone, value: 'Europe/Riga' }),
        new Setting({ id: '5', name: JiraUserSettings.locale, value: 'lv-LV' }),
        new Setting({ id: '3', name: 'non-jira-setting', value: 'value' }),
      ]).asReadonly(),
      update: vi.fn((setting: Setting) => of(setting)),
      list: vi.fn(() => of([])),
    };
    matSnackBarMock = {
      open: vi.fn(),
    };
    settingsChangeSaveServiceMock = {
      save: vi.fn(),
    };
    tagManagementSaveServiceMock = {
      save: vi.fn(),
    };
    tagsServiceMock = {
      tags: signal([
        new Tag({ id: 'tag-1', name: 'Tag 1', isUsed: false }),
        new Tag({ id: 'tag-2', name: 'Tag 2', isUsed: true }),
      ]).asReadonly(),
      list: vi.fn(() => of([])),
      create: vi.fn((tag: Tag) => of(tag)),
      update: vi.fn((tag: Tag) => of(tag)),
      delete: vi.fn(() => of(undefined)),
    };
    reportService = new ReportServiceStub({
      settingsControlsState: {
        reportMode: ReportMode.dateRange,
        tags: [{ id: 'tag-1', name: 'Tag 1' } as Tag],
        date: new Date('2026-01-01T00:00:00.000Z'),
        startDate: new Date('2026-01-02T00:00:00.000Z'),
        endDate: new Date('2026-01-03T00:00:00.000Z'),
        showWeekends: true,
        hideUnreportedTasks: false,
        showDatePicker: true,
      },
      onApplySettingsIntent: applyReportSettingsIntent,
    });
    await TestBed
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: TagsService, useValue: tagsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: MatSnackBar, useValue: matSnackBarMock },
          { provide: SettingsChangeSaveService, useValue: settingsChangeSaveServiceMock },
          { provide: TagManagementSaveService, useValue: tagManagementSaveServiceMock },
        ],
      })
      .overrideComponent(
        SettingsComponent,
        {
          set: {
            imports: [
              ReportConfiguratorStubComponent,
              JiraApiConfiguratorStubComponent,
              UserSettingsConfiguratorStubComponent,
              TagManagementConfiguratorStubComponent,
            ],
          },
        },
      )
      .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders settings configurators', () => {
    expect(tagsServiceMock.list).toHaveBeenCalledTimes(1);
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-tag-management-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-timezone-configurator'))).toBeTruthy();
  });

  it('reloads tags when the settings page initializes', () => {
    expect(tagsServiceMock.list).toHaveBeenCalledTimes(1);
  });

  it('binds configurator inputs from signal state', async () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;
    const taskListCfg = fixture.debugElement.query(By.directive(TagManagementConfiguratorStubComponent)).componentInstance as TagManagementConfiguratorStubComponent;
    const timezoneCfg = fixture.debugElement.query(By.directive(UserSettingsConfiguratorStubComponent)).componentInstance as UserSettingsConfiguratorStubComponent;

    expect(reportCfg.disabled()).toBe(false);
    expect(reportCfg.reportSettings().reportMode).toBe(ReportMode.dateRange);
    expect(jiraCfg.disabled()).toBe(false);
    expect(jiraCfg.settings().length).toBe(2);
    expect(taskListCfg.disabled()).toBe(false);
    expect(taskListCfg.tags().length).toBe(2);
    expect(timezoneCfg.disabled()).toBe(false);
    expect(timezoneCfg.settings().length).toBe(2);
  });

  it('forwards child output events through template bindings', () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;
    const taskListCfg = fixture.debugElement.query(By.directive(TagManagementConfiguratorStubComponent)).componentInstance as TagManagementConfiguratorStubComponent;
    const timezoneCfg = fixture.debugElement.query(By.directive(UserSettingsConfiguratorStubComponent)).componentInstance as UserSettingsConfiguratorStubComponent;
    const changedSettings: SettingsSaveEvent = {
      changedSettings: [new Setting({ id: 'x', name: JiraApiSettings.host, value: 'https://x' })],
      successMessage: 'Successfully saved JIRA API settings!',
    };
    const timezoneChangedSettings: SettingsSaveEvent = {
      changedSettings: [new Setting({ id: 'z', name: JiraUserSettings.userTimeZone, value: 'UTC' })],
      successMessage: 'Successfully saved user preferences!',
    };
    const tagCreateEvent: TagManagementCommand = {
      action: 'create',
      tag: new Tag({ name: 'New Tag' }),
    };
    const date = new Date('2026-02-10T00:00:00.000Z');

    reportCfg.reportSettingsChange.emit({ type: 'set-date', date });
    jiraCfg.settingsChange.emit(changedSettings);
    taskListCfg.tagChange.emit(tagCreateEvent);
    timezoneCfg.settingsChange.emit(timezoneChangedSettings);

    expect(applyReportSettingsIntent).toHaveBeenCalledWith({ type: 'set-date', date });
    expect(settingsChangeSaveServiceMock.save).toHaveBeenCalledWith(changedSettings);
    expect(settingsChangeSaveServiceMock.save).toHaveBeenCalledWith(timezoneChangedSettings);
    expect(tagManagementSaveServiceMock.save).toHaveBeenCalledWith(tagCreateEvent);
  });

  it('filters jira settings from full settings state', async () => {
    const jiraSettings = (component as any).jiraApiSettings() as Setting[];

    expect(jiraSettings).toHaveLength(2);
    expect(jiraSettings.every((setting) => Object.values(JiraApiSettings).includes(setting.name as JiraApiSettings))).toBe(true);
  });

  it('maps report service signals into reportSettings', async () => {
    const reportSettings = (component as any).reportSettings() as ReportSettingsControlsState;

    expect(reportSettings.reportMode).toBe(ReportMode.dateRange);
    expect(reportSettings.tags).toHaveLength(1);
    expect(reportSettings.showWeekends).toBe(true);
    expect(reportSettings.hideUnreportedTasks).toBe(false);
    expect(reportSettings.showDatePicker).toBe(true);
  });

  it('forwards report settings intent to report service', () => {
    const intent: ReportSettingsIntent = {
      type: 'set-report-mode',
      reportMode: ReportMode.date,
    };

    (component as any).onReportSettingsChange(intent);

    expect(applyReportSettingsIntent).toHaveBeenCalledWith(intent);
  });

  it('forwards settings changes to the save service', () => {
    const saveEvent: SettingsSaveEvent = {
      changedSettings: [
        new Setting({ id: '11', name: JiraApiSettings.enabled, value: 'false' }),
        new Setting({ id: '12', name: JiraApiSettings.host, value: 'https://new.example' }),
      ],
      successMessage: 'Successfully saved JIRA API settings!',
    };

    (component as any).onSettingsChange(saveEvent);

    expect(settingsChangeSaveServiceMock.save).toHaveBeenCalledWith(saveEvent);
  });

  it('forwards tag management commands to the save service', () => {
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

    (component as any).onTagManagementChange(createEvent);
    (component as any).onTagManagementChange(updateEvent);
    (component as any).onTagManagementChange(deleteEvent);

    expect(tagManagementSaveServiceMock.save).toHaveBeenCalledWith(createEvent);
    expect(tagManagementSaveServiceMock.save).toHaveBeenCalledWith(updateEvent);
    expect(tagManagementSaveServiceMock.save).toHaveBeenCalledWith(deleteEvent);
  });

});

describe('Settings Views settings.component integration', () => {
  it('renders real settings template with configurators', async () => {
    const settingsServiceMock = {
      settings: signal([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
      ]).asReadonly(),
      update: vi.fn((setting: Setting) => of(setting)),
      list: vi.fn(() => of([])),
    };
    const tagsServiceMock = {
      tags: signal([new Tag({ id: 'tag-1', name: 'Tag 1', isUsed: false })]).asReadonly(),
      list: vi.fn(() => of([])),
      create: vi.fn((tag: Tag) => of(tag)),
      update: vi.fn((tag: Tag) => of(tag)),
      delete: vi.fn(() => of(undefined)),
    };
    const reportService = new ReportServiceStub();

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: TagsService, useValue: tagsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: MatSnackBar, useValue: { open: vi.fn() } },
          { provide: SettingsChangeSaveService, useValue: { save: vi.fn() } },
          { provide: TagManagementSaveService, useValue: { save: vi.fn() } },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.settings-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-tag-management-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-timezone-configurator'))).toBeTruthy();
  });

  it('wires real child outputs through template listeners', async () => {
    const settingsServiceMock = {
      settings: signal([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
      ]).asReadonly(),
      update: vi.fn((setting: Setting) => of(setting)),
      list: vi.fn(() => of([])),
    };
    const tagsServiceMock = {
      tags: signal([new Tag({ id: 'tag-1', name: 'Tag 1', isUsed: false })]).asReadonly(),
      list: vi.fn(() => of([])),
    };
    const reportService = new ReportServiceStub();
    const settingsChangeSaveServiceMock = {
      save: vi.fn(),
    };
    const tagManagementSaveServiceMock = {
      save: vi.fn(),
    };

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: TagsService, useValue: tagsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: MatSnackBar, useValue: { open: vi.fn() } },
          { provide: SettingsChangeSaveService, useValue: settingsChangeSaveServiceMock },
          { provide: TagManagementSaveService, useValue: tagManagementSaveServiceMock },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorComponent)).componentInstance as any;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorComponent)).componentInstance as any;
    const timezoneCfg = fixture.debugElement.query(By.directive(UserSettingsConfiguratorComponent)).componentInstance as any;
    const date = new Date('2026-02-11T00:00:00.000Z');
    const reportSettingsSpy = vi.spyOn(component, 'onReportSettingsChange');
    const settingsSpy = vi.spyOn(component, 'onSettingsChange');

    reportCfg.reportSettingsChange.emit({ type: 'set-date', date });
    jiraCfg.settingsChange.emit({
      changedSettings: [new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://changed' })],
      successMessage: 'Successfully saved JIRA API settings!',
    });
    timezoneCfg.settingsChange.emit({
      changedSettings: [new Setting({ id: '3', name: JiraUserSettings.userTimeZone, value: 'UTC' })],
      successMessage: 'Successfully saved user preferences!',
    });

    expect(reportSettingsSpy).toHaveBeenCalled();
    expect(settingsSpy).toHaveBeenCalled();
  });
});
