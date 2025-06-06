import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksViewComponent } from './tasks-view.component';

describe('TasksViewComponent', () => {
  let component: TasksViewComponent;
  let fixture: ComponentFixture<TasksViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TasksViewComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TasksViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
