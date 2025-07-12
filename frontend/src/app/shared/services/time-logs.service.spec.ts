import { TestBed } from '@angular/core/testing';

import { TimeLogsService } from './time-logs.service';

describe('TimeLogsService', () => {
  let service: TimeLogsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeLogsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
