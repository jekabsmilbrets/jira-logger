import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { ReportMode } from '@report/enums/report-mode.enum';

import { ReportModeSwitcherComponent } from './report-mode-switcher.component';

describe('Shared Components report-mode-switcher.component', () => {
  it('renders select options and emits reportModeChange', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    fixture.componentRef.setInput('showLabel', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-select'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('mat-label'))?.nativeElement.textContent).toContain('Report mode');

    const component = fixture.componentInstance as any;
    const emitSpy = vi.spyOn(component.reportModeChange, 'emit');
    component.reportModeValueChange(ReportMode.dateRange);

    expect(emitSpy).toHaveBeenCalledWith(ReportMode.dateRange);
  });

  it('handles disabled and reportMode inputs', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(component.reportModeForm().disabled()).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('reportMode', ReportMode.date);
    fixture.detectChanges();
    expect(component.reportModeForm().disabled()).toBe(false);
    expect(component.reportModeFormModel().reportMode).toBe(ReportMode.date);

    fixture.componentRef.setInput('reportMode', null);
    fixture.detectChanges();
    expect(component.reportModeFormModel().reportMode).toBe(ReportMode.total);
  });

  it('triggers mat-select valueChange listener from template', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'reportModeValueChange');

    fixture.debugElement.query(By.css('mat-select')).triggerEventHandler('valueChange', ReportMode.total);

    expect(spy).toHaveBeenCalledWith(ReportMode.total);
  });
});
