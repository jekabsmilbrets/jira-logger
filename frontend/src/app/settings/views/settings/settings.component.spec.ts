import { ChangeDetectionStrategy, Component, input, output, Signal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { UserSettingsConfiguratorComponent } from '@settings/components/user-settings-configurator/user-settings-configurator.component';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import { ReportSettings } from '@settings/interfaces/report-settings.interface';
import { SettingsComponent } from '@settings/views/settings/settings.component';

@Component({
  selector: 'settings-report-configurator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class ReportConfiguratorStubComponent {
  public readonly disabled = input(false);
  public readonly reportSettings = input.required<ReportSettings>();

  public readonly reportModeChange = output<ReportMode>();
  public readonly tagChange = output<Tag[]>();
  public readonly dateChange = output<Date | null>();
  public readonly startDateChange = output<Date | null>();
  public readonly endDateChange = output<Date | null>();
  public readonly showWeekendsChange = output<boolean>();
  public readonly hideUnreportedTasksChange = output<boolean>();
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

  public readonly settingsChange = output<Setting[]>();
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

  public readonly settingsChange = output<Setting[]>();
}

const reportSetters = {
  reportMode: vi.fn<(value: ReportMode) => void>(),
  tags: vi.fn<(value: Tag[]) => void>(),
  date: vi.fn<(value: Date | null) => void>(),
  startDate: vi.fn<(value: Date | null) => void>(),
  endDate: vi.fn<(value: Date | null) => void>(),
  showWeekends: vi.fn<(value: boolean) => void>(),
  hideUnreportedTasks: vi.fn<(value: boolean) => void>(),
};

describe('Settings Views settings.component', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let reportService: ReportServiceStub;
  let settingsServiceMock: {
    settings: Signal<Setting[]>;
    update: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let windowMock: Window;

  beforeEach(async () => {
    Object.values(reportSetters).forEach((setter) => setter.mockReset());

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
    reportService = new ReportServiceStub({
      reportMode: ReportMode.dateRange,
      tags: [{ id: 'tag-1', name: 'Tag 1' } as Tag],
      date: new Date('2026-01-01T00:00:00.000Z'),
      startDate: new Date('2026-01-02T00:00:00.000Z'),
      endDate: new Date('2026-01-03T00:00:00.000Z'),
      showWeekends: true,
      hideUnreportedTasks: false,
      onSetReportMode: reportSetters.reportMode,
      onSetTags: reportSetters.tags,
      onSetDate: reportSetters.date,
      onSetStartDate: reportSetters.startDate,
      onSetEndDate: reportSetters.endDate,
      onSetShowWeekends: reportSetters.showWeekends,
      onSetHideUnreportedTasks: reportSetters.hideUnreportedTasks,
    });
    windowMock = {
      location: {
        ...window.location,
        reload: vi.fn(),
      },
    } as unknown as Window;

    await TestBed
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: Window, useValue: windowMock },
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
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-timezone-configurator'))).toBeTruthy();
  });

  it('binds configurator inputs from signal state', async () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;
    const timezoneCfg = fixture.debugElement.query(By.directive(UserSettingsConfiguratorStubComponent)).componentInstance as UserSettingsConfiguratorStubComponent;

    expect(reportCfg.disabled()).toBe(false);
    expect(reportCfg.reportSettings().reportMode).toBe(ReportMode.dateRange);
    expect(jiraCfg.disabled()).toBe(false);
    expect(jiraCfg.settings().length).toBe(2);
    expect(timezoneCfg.disabled()).toBe(false);
    expect(timezoneCfg.settings().length).toBe(2);
  });

  it('forwards child output events through template bindings', () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;
    const timezoneCfg = fixture.debugElement.query(By.directive(UserSettingsConfiguratorStubComponent)).componentInstance as UserSettingsConfiguratorStubComponent;
    const changedSettings = [new Setting({ id: 'x', name: JiraApiSettings.host, value: 'https://x' })];
    const timezoneChangedSettings = [new Setting({ id: 'z', name: JiraUserSettings.userTimeZone, value: 'UTC' })];
    const date = new Date('2026-02-10T00:00:00.000Z');

    reportCfg.reportModeChange.emit(ReportMode.date);
    reportCfg.tagChange.emit([{ id: 't1', name: 'Tag 1' } as Tag]);
    reportCfg.dateChange.emit(date);
    reportCfg.startDateChange.emit(date);
    reportCfg.endDateChange.emit(date);
    reportCfg.showWeekendsChange.emit(true);
    reportCfg.hideUnreportedTasksChange.emit(true);
    jiraCfg.settingsChange.emit(changedSettings);
    timezoneCfg.settingsChange.emit(timezoneChangedSettings);

    expect(reportSetters.reportMode).toHaveBeenCalledWith(ReportMode.date);
    expect(reportSetters.tags).toHaveBeenCalled();
    expect(reportSetters.date).toHaveBeenCalledWith(date);
    expect(reportSetters.startDate).toHaveBeenCalledWith(date);
    expect(reportSetters.endDate).toHaveBeenCalledWith(date);
    expect(reportSetters.showWeekends).toHaveBeenCalledWith(true);
    expect(reportSetters.hideUnreportedTasks).toHaveBeenCalledWith(true);
    expect(settingsServiceMock.update).toHaveBeenCalledWith(changedSettings[0], true);
    expect(settingsServiceMock.update).toHaveBeenCalledWith(timezoneChangedSettings[0], true);
  });

  it('filters jira settings from full settings state', async () => {
    const jiraSettings = (component as any).jiraApiSettings() as Setting[];

    expect(jiraSettings).toHaveLength(2);
    expect(jiraSettings.every((setting) => Object.values(JiraApiSettings).includes(setting.name as JiraApiSettings))).toBe(true);
  });

  it('maps report service signals into reportSettings', async () => {
    const reportSettings = (component as any).reportSettings() as ReportSettings;

    expect(reportSettings.reportMode).toBe(ReportMode.dateRange);
    expect(reportSettings.tags).toHaveLength(1);
    expect(reportSettings.showWeekends).toBe(true);
    expect(reportSettings.hideUnreportedTasks).toBe(false);
  });

  it('forwards report-related handlers to report service setters', () => {
    const tagList: Tag[] = [{ id: 't-1', name: 'Tag' } as Tag];
    const date = new Date('2026-02-01T00:00:00.000Z');

    (component as any).onReportModeChange(ReportMode.date);
    (component as any).onTagChange(tagList);
    (component as any).onDateChange(date);
    (component as any).onStartDateChange(date);
    (component as any).onEndDateChange(date);
    (component as any).onShowWeekendsChange(true);
    (component as any).onHideUnreportedTasksChange(true);

    expect(reportSetters.reportMode).toHaveBeenCalledWith(ReportMode.date);
    expect(reportSetters.tags).toHaveBeenCalledWith(tagList);
    expect(reportSetters.date).toHaveBeenCalledWith(date);
    expect(reportSetters.startDate).toHaveBeenCalledWith(date);
    expect(reportSetters.endDate).toHaveBeenCalledWith(date);
    expect(reportSetters.showWeekends).toHaveBeenCalledWith(true);
    expect(reportSetters.hideUnreportedTasks).toHaveBeenCalledWith(true);
  });

  it('updates each changed setting when settingsChange is received', () => {
    const changedSettings = [
      new Setting({ id: '11', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '12', name: JiraApiSettings.host, value: 'https://new.example' }),
    ];

    (component as any).onSettingsChange(changedSettings);

    expect(settingsServiceMock.update).toHaveBeenCalledTimes(2);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(1, changedSettings[0], true);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(2, changedSettings[1], true);
  });

  it('does not reload page after locale setting update when reload is disabled', () => {
    const changedSettings = [
      new Setting({ id: '99', name: JiraUserSettings.locale, value: 'en-US' }),
    ];

    (component as any).onSettingsChange(changedSettings);

    expect(settingsServiceMock.update).toHaveBeenCalledTimes(1);
    expect(windowMock.location.reload).not.toHaveBeenCalled();
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
    const windowMock = {
      location: {
        ...window.location,
        reload: vi.fn(),
      },
    } as unknown as Window;
    const reportService = new ReportServiceStub();

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: Window, useValue: windowMock },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.settings-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
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
    const windowMock = {
      location: {
        ...window.location,
        reload: vi.fn(),
      },
    } as unknown as Window;
    const reportService = new ReportServiceStub();

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useValue: reportService },
          { provide: Window, useValue: windowMock },
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
    const modeSpy = vi.spyOn(component, 'onReportModeChange');
    const tagSpy = vi.spyOn(component, 'onTagChange');
    const dateSpy = vi.spyOn(component, 'onDateChange');
    const startSpy = vi.spyOn(component, 'onStartDateChange');
    const endSpy = vi.spyOn(component, 'onEndDateChange');
    const weekendsSpy = vi.spyOn(component, 'onShowWeekendsChange');
    const hideSpy = vi.spyOn(component, 'onHideUnreportedTasksChange');
    const settingsSpy = vi.spyOn(component, 'onSettingsChange');

    reportCfg.reportModeChange.emit(ReportMode.date);
    reportCfg.tagChange.emit([{ id: 'x', name: 'X' } as Tag]);
    reportCfg.dateChange.emit(date);
    reportCfg.startDateChange.emit(date);
    reportCfg.endDateChange.emit(date);
    reportCfg.showWeekendsChange.emit(true);
    reportCfg.hideUnreportedTasksChange.emit(true);
    jiraCfg.settingsChange.emit([new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://changed' })]);
    timezoneCfg.settingsChange.emit([new Setting({ id: '3', name: JiraUserSettings.userTimeZone, value: 'UTC' })]);

    expect(modeSpy).toHaveBeenCalled();
    expect(tagSpy).toHaveBeenCalled();
    expect(dateSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(weekendsSpy).toHaveBeenCalled();
    expect(hideSpy).toHaveBeenCalled();
    expect(settingsSpy).toHaveBeenCalled();
  });
});
