import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksSettingsTogglerComponent } from './tasks-settings-toggler.component';

describe('TasksSettingsTogglerComponent', () => {
  let component: TasksSettingsTogglerComponent;
  let fixture: ComponentFixture<TasksSettingsTogglerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
                                           declarations: [TasksSettingsTogglerComponent],
                                         })
                 .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TasksSettingsTogglerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
