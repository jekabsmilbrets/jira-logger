import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';

import { ReportSettingsControlsComponent } from '@report/components/report-settings-controls/report-settings-controls.component';
import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';

import { ReportConfiguratorComponent } from './report-configurator.component';

describe('Settings Components report-configurator.component', () => {
  let fixture: ComponentFixture<ReportConfiguratorComponent>;
  let component: ReportConfiguratorComponent;

  const reportSettings: ReportSettingsControlsState = {
    reportMode: ReportMode.date,
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

  it('passes settings to shared Report Settings controls', () => {
    const controls = fixture.debugElement.query(By.directive(ReportSettingsControlsComponent)).componentInstance as ReportSettingsControlsComponent;

    expect(controls.state()).toBe(reportSettings);
  });

  it('emits Report Settings intent from shared controls', () => {
    const emitSpy = vi.spyOn((component as any).reportSettingsChange, 'emit');
    const date = new Date('2026-04-15T00:00:00.000Z');
    const controls = fixture.debugElement.query(By.directive(ReportSettingsControlsComponent)).componentInstance as ReportSettingsControlsComponent;
    const intent = { type: 'set-date' as const, date };

    controls.settingsIntent.emit(intent);

    expect(emitSpy).toHaveBeenCalledWith(intent);
  });
});
