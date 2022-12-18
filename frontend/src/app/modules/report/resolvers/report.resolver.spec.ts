import { TestBed } from '@angular/core/testing';

import { ReportResolver } from './report.resolver';

describe('ReportResolver', () => {
  let resolver: ReportResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(ReportResolver);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });
});
