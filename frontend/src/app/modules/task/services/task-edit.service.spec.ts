import { TestBed } from '@angular/core/testing';

import { TaskEditService } from './task-edit.service';


describe('TaskEditService', () => {
  let service: TaskEditService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskEditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
