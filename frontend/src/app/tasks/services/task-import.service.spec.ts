import { TestBed } from '@angular/core/testing';

import { TaskImportService } from './task-import.service';

describe('TaskImportService', () => {
  let service: TaskImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
