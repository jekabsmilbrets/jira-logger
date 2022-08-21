import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksSettingsDialogComponent } from 'app/modules/task/components/settings-dialog/tasks-settings-dialog.component';

describe('TasksSettingsDialogComponent', () => {
  let component: TasksSettingsDialogComponent;
  let fixture: ComponentFixture<TasksSettingsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
                                           declarations: [TasksSettingsDialogComponent],
                                         })
                 .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
