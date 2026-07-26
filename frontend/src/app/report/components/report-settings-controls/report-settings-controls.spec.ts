import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ReportDateSelector } from '@shared/components/report-menu/report-date-selector/report-date-selector';
import { ReportHideUnreportedTasks } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks';
import { ReportModeSwitcher } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher';
import { ReportShowWeekends } from '@shared/components/report-menu/report-show-weekends/report-show-weekends';
import { ReportTagFilter } from '@shared/components/report-menu/report-tag-filter/report-tag-filter';
import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';

import { ReportSettingsControls } from './report-settings-controls';

describe('Report Component ReportSettingsControls', () => {
  let fixture: ComponentFixture<ReportSettingsControls>;
  let component: ReportSettingsControls;

  const state: ReportSettingsControlsState = {
    reportMode: ReportMode.dateRange,
    tags: [{ id: 'tag-1', name: 'Core' } as Tag],
    date: new Date('2026-03-10T00:00:00.000Z'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    showWeekends: true,
    hideUnreportedTasks: true,
    showDatePicker: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportSettingsControls],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportSettingsControls);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();
  });

  it('shows date picker from Report Settings controls state', () => {
    expect(fixture.debugElement.query(By.directive(ReportDateSelector))).toBeTruthy();

    fixture.componentRef.setInput('state', { ...state, showDatePicker: false });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(ReportDateSelector))).toBeNull();
  });

  it('can hide weekends control in date mode for compact report menus', () => {
    fixture.componentRef.setInput('state', {
      ...state,
      reportMode: ReportMode.date,
    });
    fixture.componentRef.setInput('hideWeekendsWhenDateMode', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(ReportShowWeekends))).toBeNull();
  });

  it('emits Report Settings intent from child controls', () => {
    const emitSpy = vi.spyOn(component.settingsIntent, 'emit');
    const date = new Date('2026-04-12T00:00:00.000Z');
    const tags = [{ id: 't-1', name: 'Backend' } as Tag];

    fixture.debugElement.query(By.directive(ReportModeSwitcher)).componentInstance.reportModeChange.emit(ReportMode.date);
    fixture.debugElement.query(By.directive(ReportDateSelector)).componentInstance.dateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportDateSelector)).componentInstance.startDateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportDateSelector)).componentInstance.endDateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportTagFilter)).componentInstance.tagChange.emit(tags);
    fixture.debugElement.query(By.directive(ReportHideUnreportedTasks)).componentInstance.hideUnreportedTasksChange.emit(false);
    fixture.debugElement.query(By.directive(ReportShowWeekends)).componentInstance.showWeekendsChange.emit(false);

    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-report-mode', reportMode: ReportMode.date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-date', date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-start-date', startDate: date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-end-date', endDate: date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-tags', tags });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-hide-unreported-tasks', hideUnreportedTasks: false });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-show-weekends', showWeekends: false });
  });
});
