import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Timezone } from '@core/services/timezone';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModal } from './time-log-modal';

describe('Tasks Components time-log-modal', () => {
  const setup = async (timeLog?: TimeLog) => {
    const dialogRef = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TimeLogModal],
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
        { provide: Timezone, useValue: { timezone: 'Europe/Vienna' } },
      ],
    })
      .compileComponents();

    const fixture = TestBed.createComponent(TimeLogModal);
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

  it('initializes form state from dialog data', async () => {
    const { component } = await setup();

    expect(component['timeLogFormModel']().description).toBe('desc');
    expect(component['timeLogFormModel']().startTime).toBeInstanceOf(Date);
  });

  it('initializes optional end time and description when absent', async () => {
    const { component } = await setup(new TimeLog({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: undefined,
      description: undefined,
    }));

    expect(component['timeLogFormModel']().endTime).toBeNull();
    expect(component['timeLogFormModel']().description).toBe('');
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

    component['timeLogFormModel'].set({
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

    component['timeLogFormModel'].set({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: undefined as unknown as Date | null,
      description: 'updated',
    });

    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.responseType).toBe('update');
    expect(payload.responseData.endTime).toBeUndefined();
  });

  it('returns invalid chronology when end is not after start', async () => {
    const { component, fixture } = await setup();

    component['timeLogFormModel'].set({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date('2026-03-02T09:59:00.000Z'),
      description: 'desc',
    });
    fixture.detectChanges();

    expect(component['timeLogForm'].endTime().getError('invalidChronology')).toBeTruthy();
    expect(fixture.debugElement.query(By.css('p'))?.nativeElement.textContent).toContain('End time must be later than start time.');
  });

  it('returns valid chronology for null and strictly later end times', async () => {
    const { component } = await setup();

    component['timeLogFormModel'].set({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: null,
      description: 'desc',
    });
    expect(component['timeLogForm'].endTime().getError('invalidChronology')).toBeUndefined();

    component['timeLogFormModel'].set({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date('2026-03-02T11:00:00.000Z'),
      description: 'desc',
    });
    expect(component['timeLogForm'].endTime().getError('invalidChronology')).toBeUndefined();
  });

  it('does not close when save validation fails', async () => {
    const { component, dialogRef } = await setup();
    component['timeLogFormModel'].set({ startTime: null, endTime: null, description: '' });

    component['onSave']();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('falls back to locale formatting when the configured timezone is invalid', async () => {
    const { component } = await setup();
    (component as any).timezoneService = { timezone: 'Invalid/Timezone' };

    expect(component['modalTitleDateTime']).toContain('2026');
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
