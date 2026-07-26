import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';

import { ResponsiveMenu } from './responsive-menu';

describe('Shared Services ResponsiveMenu', () => {
  const breakpointState$ = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: { '(max-width: 1300px)': false },
  });

  beforeEach(() => {
    breakpointState$.next({
      matches: false,
      breakpoints: { '(max-width: 1300px)': false },
    });

    TestBed.configureTestingModule({
      providers: [
        ResponsiveMenu,
        {
          provide: BreakpointObserver,
          useValue: {
            observe: vi.fn().mockReturnValue(breakpointState$.asObservable()),
          },
        },
      ],
    });
  });

  it('exposes the shared smaller-than-desktop state', () => {
    const service = TestBed.inject(ResponsiveMenu);

    expect(service.isSmallerThanDesktop()).toBe(false);

    breakpointState$.next({
      matches: true,
      breakpoints: { '(max-width: 1300px)': true },
    });

    expect(service.isSmallerThanDesktop()).toBe(true);
  });
});
