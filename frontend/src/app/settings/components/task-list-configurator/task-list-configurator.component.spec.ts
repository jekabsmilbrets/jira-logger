import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { TaskListConfiguratorComponent } from './task-list-configurator.component';

describe('Settings Components task-list-configurator.component', () => {
  let fixture: ComponentFixture<TaskListConfiguratorComponent>;
  let component: TaskListConfiguratorComponent;
  let areYouSureServiceMock: {
    openDialog: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    areYouSureServiceMock = {
      openDialog: vi.fn(() => of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [
        TaskListConfiguratorComponent,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AreYouSureService, useValue: areYouSureServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tags', [
      new Tag({ id: 'tag-1', name: 'Backend', isUsed: false }),
      new Tag({ id: 'tag-2', name: 'Client', isUsed: true }),
    ]);
    fixture.detectChanges();
  });

  it('renders task list card heading and tag rows', () => {
    const heading = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;
    const rowCount = fixture.debugElement.queryAll(By.css('.task-list-configurator__row')).length;

    expect(heading.textContent?.trim()).toBe('Task List');
    expect(rowCount).toBe(3);
  });

  it('uses false as the default disabled input', () => {
    expect(component.disabled()).toBe(false);
  });

  it('emits create events for valid trimmed names', () => {
    const emitSpy = vi.spyOn((component as any).tagChange, 'emit');
    const addButton = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement as HTMLButtonElement;

    expect(addButton.disabled).toBe(true);

    (component as any).onNewTagNameInput('  New Tag  ');
    fixture.detectChanges();
    addButton.click();

    expect(emitSpy).toHaveBeenCalledWith({
      action: 'create',
      successMessage: 'Successfully created tag!',
      tag: expect.objectContaining({ name: 'New Tag' }),
    });
  });

  it('disables save for unchanged names and emits trimmed updates', () => {
    const emitSpy = vi.spyOn((component as any).tagChange, 'emit');
    const backendTag = component.tags()[0];

    expect((component as any).isSaveDisabled(backendTag)).toBe(true);

    (component as any).onTagNameInput(backendTag.id, '  Backend Team  ');
    fixture.detectChanges();
    (component as any).onSaveTag(backendTag);

    expect(emitSpy).toHaveBeenCalledWith({
      action: 'update',
      successMessage: 'Successfully updated tag!',
      tag: expect.objectContaining({
        id: 'tag-1',
        isUsed: false,
        name: 'Backend Team',
      }),
    });
  });

  it('disables delete and renders a usage hint for used tags', () => {
    const deleteButtons = fixture.debugElement.queryAll(By.css('button'))
      .filter((button) => (button.nativeElement as HTMLButtonElement).textContent?.trim() === 'Delete');
    const usageHint = fixture.debugElement.query(By.css('.task-list-configurator__usage-hint'))?.nativeElement as HTMLElement;

    expect((component as any).isDeleteDisabled(component.tags()[1])).toBe(true);
    expect((deleteButtons[1].nativeElement as HTMLButtonElement).disabled).toBe(true);
    expect(usageHint.textContent?.trim()).toBe('Used by existing tasks');
  });

  it('opens confirmation and emits delete only for unused tags', () => {
    const emitSpy = vi.spyOn((component as any).tagChange, 'emit');
    const backendTag = component.tags()[0];

    (component as any).onDeleteTag(backendTag);

    expect(areYouSureServiceMock.openDialog).toHaveBeenCalledWith('Backend');
    expect(emitSpy).toHaveBeenCalledWith({
      action: 'delete',
      successMessage: 'Successfully deleted tag!',
      tag: backendTag,
    });
  });

  it('respects parent disabled state', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((component as any).isCreateDisabled()).toBe(true);
    expect((component as any).isDeleteDisabled(component.tags()[0])).toBe(true);
  });
});
