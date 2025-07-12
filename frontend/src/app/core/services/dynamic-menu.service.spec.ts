import { TestBed } from '@angular/core/testing';

import { DynamicMenuService } from './dynamic-menu.service';

describe('DynamicMenuService', () => {
  let service: DynamicMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
