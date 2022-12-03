import { TestBed } from '@angular/core/testing';

import { LoaderStateService } from './loader-state.service';


describe('LoaderStateService', () => {
  let service: LoaderStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoaderStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
