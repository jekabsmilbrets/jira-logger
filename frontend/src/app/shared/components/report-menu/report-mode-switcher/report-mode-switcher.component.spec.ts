import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { vi } from 'vitest';

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
    component.reportModeValueChange(ReportModeEnum.dateRange);

    expect(emitSpy).toHaveBeenCalledWith(ReportModeEnum.dateRange);
  });

  it('handles disabled and reportMode inputs', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(component.reportModeFormControl.disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('reportMode', ReportModeEnum.date);
    fixture.detectChanges();
    expect(component.reportModeFormControl.enabled).toBe(true);
    expect(component.reportModeFormControl.value).toBe(ReportModeEnum.date);

    fixture.componentRef.setInput('reportMode', null);
    fixture.detectChanges();
    expect(component.reportModeFormControl.value).toBe(ReportModeEnum.date);
  });

  it('triggers mat-select valueChange listener from template', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'reportModeValueChange');

    fixture.debugElement.query(By.css('mat-select')).triggerEventHandler('valueChange', ReportModeEnum.total);

    expect(spy).toHaveBeenCalledWith(ReportModeEnum.total);
  });
});
