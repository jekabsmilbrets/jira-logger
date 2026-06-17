import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { TagManagementConfiguratorComponent } from './tag-management-configurator.component';

describe('Settings Components tag-management-configurator.component', () => {
  let fixture: ComponentFixture<TagManagementConfiguratorComponent>;
  let component: TagManagementConfiguratorComponent;
  let areYouSureServiceMock: {
    openDialog: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    areYouSureServiceMock = {
      openDialog: vi.fn(() => of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [
        TagManagementConfiguratorComponent,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AreYouSureService, useValue: areYouSureServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TagManagementConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tags', [
      new Tag({ id: 'tag-1', name: 'Backend', isUsed: false }),
      new Tag({ id: 'tag-2', name: 'Client', isUsed: true }),
    ]);
    fixture.detectChanges();
  });

  it('renders task list card heading and tag rows', () => {
    const heading = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;
    const rowCount = fixture.debugElement.queryAll(By.css('.tag-management-configurator__row')).length;

    expect(heading.textContent?.trim()).toBe('Tags');
    expect(rowCount).toBe(3);
  });

  it('uses false as the default disabled input', () => {
    expect(component.disabled()).toBe(false);
  });

  it('emits create events for valid trimmed names', () => {
    const emitSpy = vi.spyOn((component as any).tagChange, 'emit');
    const addButton = fixture.debugElement.query(By.css('.tag-management-configurator__row--create button'))?.nativeElement as HTMLButtonElement;

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

    (component as any).onStartEdit(backendTag);
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
    const deleteButtons = fixture.debugElement.queryAll(By.css('button[aria-label="Delete tag"]'));
    const usageHint = fixture.debugElement.query(By.css('.tag-management-configurator__badge'))?.nativeElement as HTMLElement;

    expect((component as any).isDeleteDisabled(component.tags()[1])).toBe(true);
    expect((deleteButtons[1].nativeElement as HTMLButtonElement).disabled).toBe(true);
    expect(usageHint.textContent?.trim()).toBe('In use');
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

  it('switches a tag row into edit mode and can cancel editing', () => {
    const backendTag = component.tags()[0];

    expect((component as any).isEditingTag(backendTag)).toBe(false);

    (component as any).onStartEdit(backendTag);
    fixture.detectChanges();

    expect((component as any).isEditingTag(backendTag)).toBe(true);
    expect(fixture.debugElement.query(By.css('input[matInput]'))).toBeTruthy();

    (component as any).onCancelEdit(backendTag);

    expect((component as any).isEditingTag(backendTag)).toBe(false);
  });

  it('respects parent disabled state', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((component as any).isCreateDisabled()).toBe(true);
    expect((component as any).isDeleteDisabled(component.tags()[0])).toBe(true);
  });
});
