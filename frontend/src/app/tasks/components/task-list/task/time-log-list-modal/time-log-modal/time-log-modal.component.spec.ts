import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimezoneService } from '@core/services/timezone.service';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModalComponent } from './time-log-modal.component';

describe('Tasks Components time-log-modal.component', () => {
  const setup = async (timeLog?: TimeLog) => {
    const dialogRef = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TimeLogModalComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            timeLog: timeLog ?? new TimeLog({
              startTime: new Date('2026-03-02T10:00:00.000Z'),
              endTime: new Date('2026-03-02T11:00:00.000Z'),
              description: 'desc',
            }),
          },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TimezoneService, useValue: { timezone: 'Europe/Vienna' } },
      ],
    });

    const fixture = TestBed.createComponent(TimeLogModalComponent);
    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      dialogRef,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('patches form from dialog data on init', async () => {
    const { component } = await setup();

    expect(component['formGroup'].value.description).toBe('desc');
    expect(component['formGroup'].value.startTime).toBeInstanceOf(Date);
  });

  it('closes with cancel response', async () => {
    const { component, dialogRef } = await setup();

    component['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith({ responseType: 'cancel' });
  });

  it('closes with delete response', async () => {
    const { component, dialogRef } = await setup();

    component['onDelete']();

    expect(dialogRef.close).toHaveBeenCalledWith({ responseType: 'delete' });
  });

  it('normalizes zero end time to null and closes with update payload', async () => {
    const { component, dialogRef } = await setup();

    component['formGroup'].patchValue({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date(0),
      description: 'updated',
    });

    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.responseType).toBe('update');
    expect(payload.responseData.endTime).toBeUndefined();
    expect(payload.responseData.description).toBe('updated');
  });

  it('round-trips wall-clock values using the saved timezone', async () => {
    const { component, dialogRef } = await setup(new TimeLog({
      startTime: new Date('2026-06-02T22:00:00.000Z'),
      endTime: new Date('2026-06-03T21:59:00.000Z'),
      description: 'desc',
    }));

    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.responseData.startTime.toISOString()).toBe('2026-06-02T22:00:00.000Z');
    expect(payload.responseData.endTime.toISOString()).toBe('2026-06-03T21:59:00.000Z');
  });

  it('normalizes undefined end time to null before payload build', async () => {
    const { component, dialogRef } = await setup();

    component['formGroup'].patchValue({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: undefined,
      description: 'updated',
    });

    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.responseType).toBe('update');
    expect(payload.responseData.endTime).toBeUndefined();
  });

  it('returns invalid chronology when end is not after start', async () => {
    const { component, fixture } = await setup();

    component['formGroup'].patchValue({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date('2026-03-02T09:59:00.000Z'),
    });
    fixture.detectChanges();

    expect(component['formGroup'].errors).toEqual({ invalidChronology: true });
    expect(fixture.debugElement.query(By.css('p'))?.nativeElement.textContent).toContain('End time must be later than start time.');
  });

  it('returns valid chronology for null and strictly later end times', async () => {
    const { component } = await setup();

    component['formGroup'].patchValue({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: null,
    });
    expect(component['formGroup'].errors).toBeNull();

    component['formGroup'].patchValue({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date('2026-03-02T11:00:00.000Z'),
    });
    expect(component['formGroup'].errors).toBeNull();
  });

  it('triggers title/action button handlers from DOM', async () => {
    const { fixture, component } = await setup();
    const cancelSpy = vi.spyOn(component as any, 'onCancel');
    const deleteSpy = vi.spyOn(component as any, 'onDelete');
    const saveSpy = vi.spyOn(component as any, 'onSave');
    fixture.detectChanges();

    const closeButton = fixture.debugElement.query(By.css('button[aria-label="close dialog"]'));
    closeButton.nativeElement.click();

    const actionButtons = fixture.debugElement.queryAll(By.css('button[mat-button]'));
    actionButtons[0].nativeElement.click();
    actionButtons[1].nativeElement.click();
    actionButtons[2].nativeElement.click();

    expect(cancelSpy).toHaveBeenCalledTimes(2);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
