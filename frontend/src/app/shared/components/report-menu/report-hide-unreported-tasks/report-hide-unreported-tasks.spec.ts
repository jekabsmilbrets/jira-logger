import { TestBed } from '@angular/core/testing';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

describe('Shared Components report-hide-unreported-tasks', () => {
  it('renders toggle and emits hideUnreportedTasksChange', async () => {
    const { ReportHideUnreportedTasks } = await import('./report-hide-unreported-tasks');
    await TestBed.configureTestingModule({
      imports: [ReportHideUnreportedTasks],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportHideUnreportedTasks);
    fixture.componentRef.setInput('hideUnreportedTasks', false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-slide-toggle'))).toBeTruthy();

    const component = fixture.componentInstance as any;
    const emitSpy = vi.spyOn(component.hideUnreportedTasksChange, 'emit');

    component.onHideUnreportedTasksChange({ checked: true } as MatSlideToggleChange);
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('disables slide toggle when disabled input is true', async () => {
    const { ReportHideUnreportedTasks } = await import('./report-hide-unreported-tasks');
    await TestBed.configureTestingModule({
      imports: [ReportHideUnreportedTasks],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportHideUnreportedTasks);
    fixture.componentRef.setInput('hideUnreportedTasks', true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.disabled()).toBe(true);
  });

  it('triggers change listener from template event', async () => {
    const { ReportHideUnreportedTasks } = await import('./report-hide-unreported-tasks');
    await TestBed.configureTestingModule({
      imports: [ReportHideUnreportedTasks],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportHideUnreportedTasks);
    fixture.componentRef.setInput('hideUnreportedTasks', false);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'onHideUnreportedTasksChange');

    fixture.debugElement.query(By.css('mat-slide-toggle')).triggerEventHandler('change', { checked: true });

    expect(spy).toHaveBeenCalled();
  });
});
