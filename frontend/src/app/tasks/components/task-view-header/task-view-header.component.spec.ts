import { TestBed } from '@angular/core/testing';

import { TaskViewHeaderComponent } from './task-view-header.component';

describe('Tasks Components task-view-header.component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskViewHeaderComponent],
    }).compileComponents();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(TaskViewHeaderComponent);

    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
