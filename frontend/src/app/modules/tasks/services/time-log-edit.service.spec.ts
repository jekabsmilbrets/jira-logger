import { TestBed } from '@angular/core/testing';

import { TimeLogEditService } from './time-log-edit.service';


describe('TimeLogEditService', () => {
  let service: TimeLogEditService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeLogEditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
