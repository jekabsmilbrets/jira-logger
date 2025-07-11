import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskListConfiguratorComponent } from './task-list-configurator.component';

describe('TaskListConfiguratorComponent', () => {
  let component: TaskListConfiguratorComponent;
  let fixture: ComponentFixture<TaskListConfiguratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListConfiguratorComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(TaskListConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
