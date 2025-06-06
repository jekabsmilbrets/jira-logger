import { TestBed } from '@angular/core/testing';

import { AreYouSureService } from './are-you-sure.service';

describe('AreYouSureService', () => {
  let service: AreYouSureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AreYouSureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
