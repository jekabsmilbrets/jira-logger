import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { ReportTagFilterComponent } from './report-tag-filter.component';

describe('Shared Components report-tag-filter.component', () => {
  it('renders select and emits tagChange on value change callback', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilterComponent],
      providers: [{ provide: TagsService, useValue: { tags$: of([{ id: '1', name: 'Backend' } as Tag]) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilterComponent);
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
      imports: [ReportTagFilterComponent],
      providers: [{ provide: TagsService, useValue: { tags$: of([]) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilterComponent);
    const component = fixture.componentInstance as any;

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(component.tagFormControl.disabled).toBe(true);

    const tags = [{ id: '2', name: 'Frontend' } as Tag];
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('tags', tags);
    fixture.detectChanges();
    expect(component.tagFormControl.enabled).toBe(true);
    expect(component.tagFormControl.value).toEqual(tags);

    fixture.componentRef.setInput('tags', null);
    fixture.detectChanges();
    expect(component.tagFormControl.value).toEqual(tags);
  });

  it('triggers mat-select valueChange listener from template', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilterComponent],
      providers: [{ provide: TagsService, useValue: { tags$: of([]) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportTagFilterComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const spy = vi.spyOn(component, 'tagValueChange');
    const tags = [{ id: '2', name: 'Frontend' } as Tag];

    fixture.debugElement.query(By.css('mat-select')).triggerEventHandler('valueChange', tags);

    expect(spy).toHaveBeenCalledWith(tags);
  });
});
