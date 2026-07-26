import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Tags } from '@shared/services/tags';

import { ReportTagFilter } from './report-tag-filter';

describe('Shared Components report-tag-filter', () => {
  it('renders select and emits tagChange on value change callback', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilter],
      providers: [{ provide: Tags, useValue: { tags: signal([{ id: '1', name: 'Backend' } as Tag]).asReadonly() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilter);
    fixture.componentRef.setInput('showLabel', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-select'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('mat-label'))?.nativeElement.textContent).toContain('Tags');
    const component = fixture.componentInstance as any;
    const emitSpy = vi.spyOn(component.tagChange, 'emit');
    const tags = [{ id: '1', name: 'Backend' } as Tag];
    component.tagValueChange(tags);
    expect(emitSpy).toHaveBeenCalledWith(tags);
  });

  it('handles disabled and tags inputs', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilter],
      providers: [{ provide: Tags, useValue: { tags: signal<Tag[]>([]).asReadonly() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilter);
    const component = fixture.componentInstance as any;

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(component.reportTagForm().disabled()).toBe(true);

    const tags = [{ id: '2', name: 'Frontend' } as Tag];
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('tags', tags);
    fixture.detectChanges();
    expect(component.reportTagForm().disabled()).toBe(false);
    expect(component.reportTagFormModel().tags).toEqual(tags);

    fixture.componentRef.setInput('tags', null);
    fixture.detectChanges();
    expect(component.reportTagFormModel().tags).toBeNull();
  });

  it('triggers mat-select valueChange listener from template', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilter],
      providers: [{ provide: Tags, useValue: { tags: signal<Tag[]>([]).asReadonly() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilter);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'tagValueChange');
    const tags = [{ id: '2', name: 'Frontend' } as Tag];

    fixture.debugElement.query(By.css('mat-select')).triggerEventHandler('valueChange', tags);

    expect(spy).toHaveBeenCalledWith(tags);
  });
});
