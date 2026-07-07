import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';
import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';

import { ReportSettingsControlsComponent } from './report-settings-controls.component';

describe('ReportSettingsControlsComponent', () => {
  let fixture: ComponentFixture<ReportSettingsControlsComponent>;
  let component: ReportSettingsControlsComponent;

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
      imports: [ReportSettingsControlsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportSettingsControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();
  });

  it('shows date picker from Report Settings controls state', () => {
    expect(fixture.debugElement.query(By.directive(ReportDateSelectorComponent))).toBeTruthy();

    fixture.componentRef.setInput('state', { ...state, showDatePicker: false });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(ReportDateSelectorComponent))).toBeNull();
  });

  it('can hide weekends control in date mode for compact report menus', () => {
    fixture.componentRef.setInput('state', {
      ...state,
      reportMode: ReportMode.date,
    });
    fixture.componentRef.setInput('hideWeekendsWhenDateMode', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(ReportShowWeekendsComponent))).toBeNull();
  });

  it('emits Report Settings intent from child controls', () => {
    const emitSpy = vi.spyOn(component.settingsIntent, 'emit');
    const date = new Date('2026-04-12T00:00:00.000Z');
    const tags = [{ id: 't-1', name: 'Backend' } as Tag];

    fixture.debugElement.query(By.directive(ReportModeSwitcherComponent)).componentInstance.reportModeChange.emit(ReportMode.date);
    fixture.debugElement.query(By.directive(ReportDateSelectorComponent)).componentInstance.dateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportDateSelectorComponent)).componentInstance.startDateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportDateSelectorComponent)).componentInstance.endDateChange.emit(date);
    fixture.debugElement.query(By.directive(ReportTagFilterComponent)).componentInstance.tagChange.emit(tags);
    fixture.debugElement.query(By.directive(ReportHideUnreportedTasksComponent)).componentInstance.hideUnreportedTasksChange.emit(false);
    fixture.debugElement.query(By.directive(ReportShowWeekendsComponent)).componentInstance.showWeekendsChange.emit(false);

    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-report-mode', reportMode: ReportMode.date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-date', date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-start-date', startDate: date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-end-date', endDate: date });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-tags', tags });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-hide-unreported-tasks', hideUnreportedTasks: false });
    expect(emitSpy).toHaveBeenCalledWith({ type: 'set-show-weekends', showWeekends: false });
  });
});
