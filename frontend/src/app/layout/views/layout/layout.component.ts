import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task } from '@shared/models/task.model';
import { TaskManagerService } from '@shared/services/task-manager.service';

import { HeaderComponent } from '@layout/components/header/header.component';
import { SidenavComponent } from '@layout/components/sidenav/sidenav.component';
import { HEADER_MENU_ROUTE_DATA_KEY, type HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

@Component({
  selector: 'layout-view',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    MatSidenavModule,
    SidenavComponent,
    RouterOutlet,
  ],
})
export class LayoutComponent {
  private readonly loaderStateService: LoaderStateService = inject(LoaderStateService);
  private readonly taskManagerService: TaskManagerService = inject(TaskManagerService);
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
  protected readonly activeTask: Signal<Task | null> = this.taskManagerService.activeTask;
  protected readonly timeLoggedToday: Signal<number> = this.taskManagerService.timeLoggedToday;
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
