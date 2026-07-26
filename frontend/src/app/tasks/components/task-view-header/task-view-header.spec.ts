import { TestBed } from '@angular/core/testing';

import { TaskViewHeader } from './task-view-header';

describe('Tasks Components task-view-header', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskViewHeader],
    }).compileComponents();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(TaskViewHeader);

    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
