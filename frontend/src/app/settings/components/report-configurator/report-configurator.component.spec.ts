import { ComponentFixture, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';

import { ReportModeEnum } from '@report/enums/report-mode.enum';

import { ReportSettings } from '@settings/interfaces/report-settings.interface';
import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';

import { Tag } from '@shared/models/tag.model';
import { vi } from 'vitest';

import { ReportConfiguratorComponent } from './report-configurator.component';

describe('Settings Components report-configurator.component', () => {
  let fixture: ComponentFixture<ReportConfiguratorComponent>;
  let component: ReportConfiguratorComponent;

  const reportSettings: ReportSettings = {
    reportMode: ReportModeEnum.date,
    tags: [{ id: 'tag-1', name: 'Core' } as Tag],
    date: new Date('2026-03-10T00:00:00.000Z'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    showWeekends: true,
    hideUnreportedTasks: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportConfiguratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('reportSettings', reportSettings);
    fixture.detectChanges();
  });

  it('renders report card title', () => {
    const title = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;

    expect(title.textContent?.trim()).toBe('Report');
  });

  it('shows date selector for date-based report mode', () => {
    expect(fixture.debugElement.query(By.css('shared-report-date-selector'))).toBeTruthy();
  });

  it('hides date selector for total report mode', () => {
    fixture.componentRef.setInput('reportSettings', { ...reportSettings, reportMode: ReportModeEnum.total });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('shared-report-date-selector'))).toBeNull();
  });

  it('emits reportModeChange from onReportModeChange handler', () => {
    const emitSpy = vi.spyOn((component as any).reportModeChange, 'emit');

    (component as any).onReportModeChange(ReportModeEnum.dateRange);

    expect(emitSpy).toHaveBeenCalledWith(ReportModeEnum.dateRange);
  });

  it('emits tag/date/date-range/toggle outputs through dedicated handlers', () => {
    const tagChangeSpy = vi.spyOn((component as any).tagChange, 'emit');
    const dateChangeSpy = vi.spyOn((component as any).dateChange, 'emit');
    const startDateChangeSpy = vi.spyOn((component as any).startDateChange, 'emit');
    const endDateChangeSpy = vi.spyOn((component as any).endDateChange, 'emit');
    const showWeekendsChangeSpy = vi.spyOn((component as any).showWeekendsChange, 'emit');
    const hideUnreportedTasksChangeSpy = vi.spyOn((component as any).hideUnreportedTasksChange, 'emit');

    const tags = [{ id: 'tag-2', name: 'Backend' } as Tag];
    const date = new Date('2026-04-15T00:00:00.000Z');

    (component as any).onTagChange(tags);
    (component as any).onDateChange(date);
    (component as any).onStartDateChange(date);
    (component as any).onEndDateChange(date);
    (component as any).onShowWeekendsChange(false);
    (component as any).onHideUnreportedTasksChange(false);

    expect(tagChangeSpy).toHaveBeenCalledWith(tags);
    expect(dateChangeSpy).toHaveBeenCalledWith(date);
    expect(startDateChangeSpy).toHaveBeenCalledWith(date);
    expect(endDateChangeSpy).toHaveBeenCalledWith(date);
    expect(showWeekendsChangeSpy).toHaveBeenCalledWith(false);
    expect(hideUnreportedTasksChangeSpy).toHaveBeenCalledWith(false);
  });

  it('showDatePicker returns false when mode is missing', () => {
    fixture.componentRef.setInput('reportSettings', { ...reportSettings, reportMode: undefined as unknown as ReportModeEnum });
    fixture.detectChanges();

    expect((component as any).showDatePicker()).toBe(false);
  });

  it('wires child component outputs through template listeners', () => {
    const modeSpy = vi.spyOn(component as any, 'onReportModeChange');
    const tagSpy = vi.spyOn(component as any, 'onTagChange');
    const dateSpy = vi.spyOn(component as any, 'onDateChange');
    const startSpy = vi.spyOn(component as any, 'onStartDateChange');
    const endSpy = vi.spyOn(component as any, 'onEndDateChange');
    const hideSpy = vi.spyOn(component as any, 'onHideUnreportedTasksChange');
    const weekendsSpy = vi.spyOn(component as any, 'onShowWeekendsChange');

    const modeSwitcher = fixture.debugElement.query(By.directive(ReportModeSwitcherComponent)).componentInstance as any;
    const dateSelector = fixture.debugElement.query(By.directive(ReportDateSelectorComponent)).componentInstance as any;
    const tagFilter = fixture.debugElement.query(By.directive(ReportTagFilterComponent)).componentInstance as any;
    const hideToggle = fixture.debugElement.query(By.directive(ReportHideUnreportedTasksComponent)).componentInstance as any;
    const weekendsToggle = fixture.debugElement.query(By.directive(ReportShowWeekendsComponent)).componentInstance as any;
    const date = new Date('2026-04-12T00:00:00.000Z');

    modeSwitcher.reportModeChange.emit(ReportModeEnum.dateRange);
    dateSelector.dateChange.emit(date);
    dateSelector.startDateChange.emit(date);
    dateSelector.endDateChange.emit(date);
    tagFilter.tagChange.emit([{ id: 't1', name: 'Tag 1' } as Tag]);
    hideToggle.hideUnreportedTasksChange.emit(false);
    weekendsToggle.showWeekendsChange.emit(false);

    expect(modeSpy).toHaveBeenCalled();
    expect(dateSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(tagSpy).toHaveBeenCalled();
    expect(hideSpy).toHaveBeenCalled();
    expect(weekendsSpy).toHaveBeenCalled();
  });
});
