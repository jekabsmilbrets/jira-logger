import { TestBed } from '@angular/core/testing';

import { TaskCreateService } from './task-create.service';

describe('TaskCreateService', () => {
  let service: TaskCreateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskCreateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
