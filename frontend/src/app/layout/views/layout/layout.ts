import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { LoaderState } from '@core/services/loader-state';

import { Task } from '@shared/models/task.model';

import { Header } from '@layout/components/header/header';
import { Sidenav } from '@layout/components/sidenav/sidenav';
import { HEADER_MENU_ROUTE_DATA_KEY, type HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';
import { HeaderData } from '@layout/services/header-data';

@Component({
  selector: 'layout-view',
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Header,
    MatSidenavModule,
    Sidenav,
    RouterOutlet,
  ],
})
export class Layout {
  private readonly loaderStateService: LoaderState = inject(LoaderState);
  private readonly headerDataService: HeaderData = inject(HeaderData);
  private readonly router: Router = inject(Router);
  private readonly activeRouteSnapshot: Signal<ActivatedRouteSnapshot> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.routerState.snapshot.root),
      startWith(this.router.routerState.snapshot.root),
    ),
    { initialValue: this.router.routerState.snapshot.root },
  );

  protected readonly isLoading: Signal<boolean> = this.loaderStateService.isLoading;
  protected readonly activeTask: Signal<Task | null> = this.headerDataService.activeTask;
  protected readonly timeLoggedToday: Signal<number> = this.headerDataService.timeLoggedToday;
  protected readonly activeMenu: Signal<HeaderMenuRouteData | null> = computed(() => this.resolveActiveMenu(this.activeRouteSnapshot()));

  private resolveActiveMenu(
    routeSnapshot: ActivatedRouteSnapshot,
  ): HeaderMenuRouteData | null {
    let currentRoute: ActivatedRouteSnapshot | null = routeSnapshot;
    let activeMenu: HeaderMenuRouteData | null = null;

    while (currentRoute) {
      const routeMenu: HeaderMenuRouteData | undefined = currentRoute.routeConfig?.data?.[HEADER_MENU_ROUTE_DATA_KEY] as HeaderMenuRouteData | undefined;

      if (routeMenu) {
        activeMenu = routeMenu;
      }

      currentRoute = currentRoute.firstChild;
    }

    return activeMenu;
  }
}
