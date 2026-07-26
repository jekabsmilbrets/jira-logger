import { TestBed } from '@angular/core/testing';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

describe('Shared Components report-show-weekends', () => {
  it('renders toggle and emits showWeekendsChange', async () => {
    const { ReportShowWeekends } = await import('./report-show-weekends');
    await TestBed.configureTestingModule({
      imports: [ReportShowWeekends],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportShowWeekends);
    fixture.componentRef.setInput('showWeekends', false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-slide-toggle'))).toBeTruthy();

    const component = fixture.componentInstance as any;
    const emitSpy = vi.spyOn(component.showWeekendsChange, 'emit');
    component.onShowWeekendsChange({ checked: true } as MatSlideToggleChange);

    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('disables toggle when disabled input is true', async () => {
    const { ReportShowWeekends } = await import('./report-show-weekends');
    await TestBed.configureTestingModule({
      imports: [ReportShowWeekends],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportShowWeekends);
    fixture.componentRef.setInput('showWeekends', true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.disabled()).toBe(true);
  });

  it('triggers change listener from template event', async () => {
    const { ReportShowWeekends } = await import('./report-show-weekends');
    await TestBed.configureTestingModule({
      imports: [ReportShowWeekends],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportShowWeekends);
    fixture.componentRef.setInput('showWeekends', false);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'onShowWeekendsChange');

    fixture.debugElement.query(By.css('mat-slide-toggle')).triggerEventHandler('change', { checked: true });

    expect(spy).toHaveBeenCalled();
  });
});
