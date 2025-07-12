import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskViewHeaderComponent } from './task-view-header.component';

describe('TaskViewHeaderComponent', () => {
  let component: TaskViewHeaderComponent;
  let fixture: ComponentFixture<TaskViewHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskViewHeaderComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(TaskViewHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
