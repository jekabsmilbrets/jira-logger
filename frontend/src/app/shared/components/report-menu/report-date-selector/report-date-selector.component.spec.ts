import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { describe, expect, it, vi } from 'vitest';

import { ReportModeEnum } from '@report/enums/report-mode.enum';

import { ReportDateSelectorComponent } from './report-date-selector.component';

describe('Shared Components report-date-selector.component', () => {
  const createComponent = async (): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<ReportDateSelectorComponent>>;
    component: ReportDateSelectorComponent;
  }> => {
    await TestBed.configureTestingModule({
      imports: [ReportDateSelectorComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportDateSelectorComponent);
    fixture.componentRef.setInput('reportMode', ReportModeEnum.date);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  };

  it('toggles all form controls with disabled input', async () => {
    const { fixture, component } = await createComponent();

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(component['dateFormControl'].disabled).toBe(true);
    expect(component['startDateFormControl'].disabled).toBe(true);
    expect(component['endDateFormControl'].disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    expect(component['dateFormControl'].enabled).toBe(true);
    expect(component['startDateFormControl'].enabled).toBe(true);
    expect(component['endDateFormControl'].enabled).toBe(true);
  });

  it('sets control values only when date inputs are non-null', async () => {
    const { fixture, component } = await createComponent();

    const date = new Date('2024-01-02T10:00:00.000Z');
    const startDate = new Date('2024-01-03T10:00:00.000Z');
    const endDate = new Date('2024-01-04T10:00:00.000Z');

    fixture.componentRef.setInput('date', null);
    fixture.componentRef.setInput('startDate', null);
    fixture.componentRef.setInput('endDate', null);
    fixture.detectChanges();

    expect(component['dateFormControl'].value).toBeNull();
    expect(component['startDateFormControl'].value).toBeNull();
    expect(component['endDateFormControl'].value).toBeNull();

    fixture.componentRef.setInput('date', date);
    fixture.componentRef.setInput('startDate', startDate);
    fixture.componentRef.setInput('endDate', endDate);
    fixture.detectChanges();

    expect(component['dateFormControl'].value).toEqual(date);
    expect(component['startDateFormControl'].value).toEqual(startDate);
    expect(component['endDateFormControl'].value).toEqual(endDate);
  });

  it('normalizes and emits start/end/single date change events', async () => {
    const { component } = await createComponent();

    const startEmit = vi.spyOn(component['startDateChange'], 'emit');
    const endEmit = vi.spyOn(component['endDateChange'], 'emit');
    const dateEmit = vi.spyOn(component['dateChange'], 'emit');

    const start = new Date('2024-01-05T14:15:16.000Z');
    component['onStartDateChange']({ value: start } as any);
    expect(startEmit).toHaveBeenCalledTimes(1);
    expect((startEmit.mock.calls[0][0] as Date).getHours()).toBe(0);
    expect((startEmit.mock.calls[0][0] as Date).getMinutes()).toBe(0);

    const end = new Date('2024-01-06T08:09:10.000Z');
    component['onEndDateChange']({ value: end } as any);
    expect(endEmit).toHaveBeenCalledTimes(1);
    expect((endEmit.mock.calls[0][0] as Date).getHours()).toBe(23);
    expect((endEmit.mock.calls[0][0] as Date).getMinutes()).toBe(59);

    const single = new Date('2024-01-07T20:21:22.000Z');
    component['onDateChange']({ value: single } as any);
    expect(dateEmit).toHaveBeenCalledTimes(1);
    expect((dateEmit.mock.calls[0][0] as Date).getHours()).toBe(0);
    expect((dateEmit.mock.calls[0][0] as Date).getMinutes()).toBe(0);
  });

  it('does not emit when date change events contain null values', async () => {
    const { component } = await createComponent();

    const startEmit = vi.spyOn(component['startDateChange'], 'emit');
    const endEmit = vi.spyOn(component['endDateChange'], 'emit');
    const dateEmit = vi.spyOn(component['dateChange'], 'emit');

    component['onStartDateChange']({ value: null } as any);
    component['onEndDateChange']({ value: null } as any);
    component['onDateChange']({ value: null } as any);

    expect(startEmit).not.toHaveBeenCalled();
    expect(endEmit).not.toHaveBeenCalled();
    expect(dateEmit).not.toHaveBeenCalled();
  });

  it('renders date-range controls for dateRange mode and single-date controls for date mode', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportDateSelectorComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportDateSelectorComponent);
    fixture.componentRef.setInput('reportMode', ReportModeEnum.dateRange);
    fixture.componentRef.setInput('showLabel', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-date-range-input'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('input[matStartDate]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('input[matEndDate]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('mat-label'))?.nativeElement.textContent).toContain('Enter a date range');
    expect(fixture.debugElement.query(By.css('input[placeholder="Date"]'))).toBeFalsy();

    fixture.componentRef.setInput('reportMode', ReportModeEnum.date);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-date-range-input'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('mat-label'))?.nativeElement.textContent).toContain('Enter a date');
    expect(fixture.debugElement.query(By.css('input[placeholder="Date"]'))).toBeTruthy();
  });

  it('triggers dateChange listeners from template inputs', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportDateSelectorComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportDateSelectorComponent);
    const component = fixture.componentInstance as any;
    const startSpy = vi.spyOn(component, 'onStartDateChange');
    const endSpy = vi.spyOn(component, 'onEndDateChange');
    const dateSpy = vi.spyOn(component, 'onDateChange');
    const date = new Date('2026-05-30T00:00:00.000Z');

    fixture.componentRef.setInput('reportMode', ReportModeEnum.dateRange);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('input[matStartDate]')).triggerEventHandler('dateChange', { value: date });
    fixture.debugElement.query(By.css('input[matEndDate]')).triggerEventHandler('dateChange', { value: date });

    fixture.componentRef.setInput('reportMode', ReportModeEnum.date);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('input[placeholder="Date"]')).triggerEventHandler('dateChange', { value: date });

    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(dateSpy).toHaveBeenCalled();
  });
});
