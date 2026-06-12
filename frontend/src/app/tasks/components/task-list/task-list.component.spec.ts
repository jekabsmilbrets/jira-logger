import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { TaskListComponent } from './task-list.component';

describe('Tasks Components task-list.component', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates as a standalone component', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
    });

    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
