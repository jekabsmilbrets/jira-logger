import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { inject, Service, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { map } from 'rxjs';

const smallerThanDesktopBreakpoint: string = '(max-width: 1300px)';

@Service()
export class ResponsiveMenuService {
  private readonly breakpointObserver: BreakpointObserver = inject(BreakpointObserver);

  public readonly isSmallerThanDesktop: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(smallerThanDesktopBreakpoint)
      .pipe(
        map(
          (results: BreakpointState) => results.matches && results.breakpoints[smallerThanDesktopBreakpoint],
        ),
      ),
    { initialValue: false },
  );
}
