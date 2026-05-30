import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { ReportSettings } from '@settings/interfaces/report-settings.interface';
import { SettingsComponent } from '@settings/views/settings/settings.component';

import { Tag } from '@shared/models/tag.model';
import { firstValueFrom, Observable, of } from 'rxjs';
import { vi } from 'vitest';

@Component({
  selector: 'settings-report-configurator',
  standalone: true,
  template: '',
})
class ReportConfiguratorStubComponent {
  @Input() public disabled = false;
  @Input() public reportSettings!: ReportSettings;

  @Output() public readonly reportModeChange = new EventEmitter<ReportModeEnum>();
  @Output() public readonly tagChange = new EventEmitter<Tag[]>();
  @Output() public readonly dateChange = new EventEmitter<Date | null>();
  @Output() public readonly startDateChange = new EventEmitter<Date | null>();
  @Output() public readonly endDateChange = new EventEmitter<Date | null>();
  @Output() public readonly showWeekendsChange = new EventEmitter<boolean>();
  @Output() public readonly hideUnreportedTasksChange = new EventEmitter<boolean>();
}

@Component({
  selector: 'settings-jira-api-configurator',
  standalone: true,
  template: '',
})
class JiraApiConfiguratorStubComponent {
  @Input() public disabled = false;
  @Input() public settings: Setting[] = [];

  @Output() public readonly settingsChange = new EventEmitter<Setting[]>();
}

const reportSetters = {
  reportMode: vi.fn<(value: ReportModeEnum) => void>(),
  tags: vi.fn<(value: Tag[]) => void>(),
  date: vi.fn<(value: Date | null) => void>(),
  startDate: vi.fn<(value: Date | null) => void>(),
  endDate: vi.fn<(value: Date | null) => void>(),
  showWeekends: vi.fn<(value: boolean) => void>(),
  hideUnreportedTasks: vi.fn<(value: boolean) => void>(),
};

class ReportServiceMock {
  public readonly reportMode$ = of(ReportModeEnum.dateRange);
  public readonly tags$ = of([{ id: 'tag-1', name: 'Tag 1' } as Tag]);
  public readonly date$ = of(new Date('2026-01-01T00:00:00.000Z'));
  public readonly startDate$ = of(new Date('2026-01-02T00:00:00.000Z'));
  public readonly endDate$ = of(new Date('2026-01-03T00:00:00.000Z'));
  public readonly showWeekends$ = of(true);
  public readonly hideUnreportedTasks$ = of(false);

  public set reportMode(value: ReportModeEnum) {
    reportSetters.reportMode(value);
  }

  public set tags(value: Tag[]) {
    reportSetters.tags(value);
  }

  public set date(value: Date | null) {
    reportSetters.date(value);
  }

  public set startDate(value: Date | null) {
    reportSetters.startDate(value);
  }

  public set endDate(value: Date | null) {
    reportSetters.endDate(value);
  }

  public set showWeekends(value: boolean) {
    reportSetters.showWeekends(value);
  }

  public set hideUnreportedTasks(value: boolean) {
    reportSetters.hideUnreportedTasks(value);
  }
}

describe('Settings Views settings.component', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let settingsServiceMock: {
    settings$: Observable<Setting[]>;
    update: (setting: Setting) => Observable<Setting>;
  };

  beforeEach(async () => {
    Object.values(reportSetters).forEach((setter) => setter.mockReset());

    settingsServiceMock = {
      settings$: of([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
        new Setting({ id: '3', name: 'non-jira-setting', value: 'value' }),
      ]),
      update: vi.fn((setting: Setting) => of(setting)),
    };

    await TestBed
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading$: of(false) } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useClass: ReportServiceMock },
        ],
      })
      .overrideComponent(
        SettingsComponent,
        {
          set: {
            imports: [
              AsyncPipe,
              ReportConfiguratorStubComponent,
              JiraApiConfiguratorStubComponent,
            ],
          },
        },
      )
      .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders both settings configurators', () => {
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
  });

  it('binds configurator inputs from async state', async () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;

    expect(reportCfg.disabled).toBe(false);
    expect(reportCfg.reportSettings.reportMode).toBe(ReportModeEnum.dateRange);
    expect(jiraCfg.disabled).toBe(false);
    expect(jiraCfg.settings.length).toBe(2);
  });

  it('forwards child output events through template bindings', () => {
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorStubComponent)).componentInstance as ReportConfiguratorStubComponent;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorStubComponent)).componentInstance as JiraApiConfiguratorStubComponent;
    const changedSettings = [new Setting({ id: 'x', name: JiraApiSettings.host, value: 'https://x' })];
    const date = new Date('2026-02-10T00:00:00.000Z');

    reportCfg.reportModeChange.emit(ReportModeEnum.date);
    reportCfg.tagChange.emit([{ id: 't1', name: 'Tag 1' } as Tag]);
    reportCfg.dateChange.emit(date);
    reportCfg.startDateChange.emit(date);
    reportCfg.endDateChange.emit(date);
    reportCfg.showWeekendsChange.emit(true);
    reportCfg.hideUnreportedTasksChange.emit(true);
    jiraCfg.settingsChange.emit(changedSettings);

    expect(reportSetters.reportMode).toHaveBeenCalledWith(ReportModeEnum.date);
    expect(reportSetters.tags).toHaveBeenCalled();
    expect(reportSetters.date).toHaveBeenCalledWith(date);
    expect(reportSetters.startDate).toHaveBeenCalledWith(date);
    expect(reportSetters.endDate).toHaveBeenCalledWith(date);
    expect(reportSetters.showWeekends).toHaveBeenCalledWith(true);
    expect(reportSetters.hideUnreportedTasks).toHaveBeenCalledWith(true);
    expect(settingsServiceMock.update).toHaveBeenCalledWith(changedSettings[0]);
  });

  it('filters jira settings from full settings stream', async () => {
    const jiraSettings = await firstValueFrom((component as any).jiraApiSettings$ as Observable<Setting[]>);

    expect(jiraSettings).toHaveLength(2);
    expect(jiraSettings.every((setting) => Object.values(JiraApiSettings).includes(setting.name as JiraApiSettings))).toBe(true);
  });

  it('maps report service streams into reportSettings$', async () => {
    const reportSettings = await firstValueFrom((component as any).reportSettings$ as Observable<ReportSettings>);

    expect(reportSettings.reportMode).toBe(ReportModeEnum.dateRange);
    expect(reportSettings.tags).toHaveLength(1);
    expect(reportSettings.showWeekends).toBe(true);
    expect(reportSettings.hideUnreportedTasks).toBe(false);
  });

  it('forwards report-related handlers to report service setters', () => {
    const tagList: Tag[] = [{ id: 't-1', name: 'Tag' } as Tag];
    const date = new Date('2026-02-01T00:00:00.000Z');

    (component as any).onReportModeChange(ReportModeEnum.date);
    (component as any).onTagChange(tagList);
    (component as any).onDateChange(date);
    (component as any).onStartDateChange(date);
    (component as any).onEndDateChange(date);
    (component as any).onShowWeekendsChange(true);
    (component as any).onHideUnreportedTasksChange(true);

    expect(reportSetters.reportMode).toHaveBeenCalledWith(ReportModeEnum.date);
    expect(reportSetters.tags).toHaveBeenCalledWith(tagList);
    expect(reportSetters.date).toHaveBeenCalledWith(date);
    expect(reportSetters.startDate).toHaveBeenCalledWith(date);
    expect(reportSetters.endDate).toHaveBeenCalledWith(date);
    expect(reportSetters.showWeekends).toHaveBeenCalledWith(true);
    expect(reportSetters.hideUnreportedTasks).toHaveBeenCalledWith(true);
  });

  it('updates each changed setting when settingsChange is received', () => {
    const changedSettings = [
      new Setting({ id: '11', name: JiraApiSettings.enabled, value: false }),
      new Setting({ id: '12', name: JiraApiSettings.host, value: 'https://new.example' }),
    ];

    (component as any).onSettingsChange(changedSettings);

    expect(settingsServiceMock.update).toHaveBeenCalledTimes(2);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(1, changedSettings[0]);
    expect(settingsServiceMock.update).toHaveBeenNthCalledWith(2, changedSettings[1]);
  });
});

describe('Settings Views settings.component integration', () => {
  it('renders real settings template with both configurators', async () => {
    const settingsServiceMock = {
      settings$: of([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
      ]),
      update: vi.fn((setting: Setting) => of(setting)),
    };

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading$: of(false) } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useClass: ReportServiceMock },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.settings-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-report-configurator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('settings-jira-api-configurator'))).toBeTruthy();
  });

  it('wires real child outputs through template listeners', async () => {
    const settingsServiceMock = {
      settings$: of([
        new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
        new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.local' }),
      ]),
      update: vi.fn((setting: Setting) => of(setting)),
    };

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SettingsComponent],
        providers: [
          { provide: LoaderStateService, useValue: { isLoading$: of(false) } },
          { provide: SettingsService, useValue: settingsServiceMock },
          { provide: ReportService, useClass: ReportServiceMock },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const reportCfg = fixture.debugElement.query(By.directive(ReportConfiguratorComponent)).componentInstance as any;
    const jiraCfg = fixture.debugElement.query(By.directive(JiraApiConfiguratorComponent)).componentInstance as any;
    const date = new Date('2026-02-11T00:00:00.000Z');
    const modeSpy = vi.spyOn(component, 'onReportModeChange');
    const tagSpy = vi.spyOn(component, 'onTagChange');
    const dateSpy = vi.spyOn(component, 'onDateChange');
    const startSpy = vi.spyOn(component, 'onStartDateChange');
    const endSpy = vi.spyOn(component, 'onEndDateChange');
    const weekendsSpy = vi.spyOn(component, 'onShowWeekendsChange');
    const hideSpy = vi.spyOn(component, 'onHideUnreportedTasksChange');
    const settingsSpy = vi.spyOn(component, 'onSettingsChange');

    reportCfg.reportModeChange.emit(ReportModeEnum.date);
    reportCfg.tagChange.emit([{ id: 'x', name: 'X' } as Tag]);
    reportCfg.dateChange.emit(date);
    reportCfg.startDateChange.emit(date);
    reportCfg.endDateChange.emit(date);
    reportCfg.showWeekendsChange.emit(true);
    reportCfg.hideUnreportedTasksChange.emit(true);
    jiraCfg.settingsChange.emit([new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://changed' })]);

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
