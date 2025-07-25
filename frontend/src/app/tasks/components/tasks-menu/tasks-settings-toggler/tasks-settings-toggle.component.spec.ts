import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';

describe('TasksSettingsToggleComponent', () => {
  let component: TasksSettingsToggleComponent;
  let fixture: ComponentFixture<TasksSettingsToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksSettingsToggleComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TasksSettingsToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
