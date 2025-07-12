import { Component, inject, Injector, input, InputSignal, OnDestroy, Signal, viewChild, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { DynamicMenuDirective } from '@core/directives/dynamic-menu.directive';
import { DynamicMenuInterface } from '@core/interfaces/dynamic-menu.interface';
import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import { delay, filter, Observable, Subscription, switchMap, take, tap } from 'rxjs';

@Component({
  selector: 'layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, RouterLink, MatIconModule, ReadableTimePipe, DynamicMenuDirective, MatProgressBarModule],
})
export class HeaderComponent implements OnDestroy {
  public readonly sidenav: InputSignal<MatSidenav> = input.required<MatSidenav>();
  public readonly activeTask: InputSignal<null | Task> = input.required<Task | null>();
  public readonly isLoading: InputSignal<boolean> = input(false);
  public readonly timeLoggedToday: InputSignal<number> = input(0);

  private readonly dynamicMenuService: DynamicMenuService = inject(DynamicMenuService);
  private readonly router: Router = inject(Router);
  private readonly _injector: Injector = inject(Injector);

  private readonly dynamicMenu: Signal<DynamicMenuDirective> = viewChild.required(DynamicMenuDirective);

  private routerEventsSubscription: Subscription;

  constructor() {
    this.routerEventsSubscription = this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        delay(100), // hax :D :D without it loadingDynamicMenu causes loading empty dynamic menus
        switchMap((navigationEndEvent: NavigationEnd) => this.loadDynamicMenu(navigationEndEvent)),
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
  }

  protected reportDateLink(): string {
    const date: Date = new Date();
    const pad: (numberToPad: number) => string = (
      numberToPad: number,
    ) => numberToPad.toString().padStart(2, '0');
    const currentDate: string = `${ date.getFullYear() }-${ pad(date.getMonth() + 1) }-${ pad(date.getDate()) }`;
    return `/report/date/${ currentDate }`;
  }

  private loadDynamicMenu(
    navigationEndEvent: NavigationEnd,
  ): Observable<DynamicMenu[]> {
    return this.dynamicMenuService.dynamicMenus$
      .pipe(
        take(1),
        tap((dynamicMenus: DynamicMenu[]) => {
          const dynamicMenu: DynamicMenu | undefined = dynamicMenus.find(
            (dM: DynamicMenu) => navigationEndEvent.urlAfterRedirects.includes(dM.data.route),
          );

          if (dynamicMenu) {
            const viewContainerRef: ViewContainerRef = this.dynamicMenu().viewContainerRef;
            viewContainerRef.clear();

            viewContainerRef.createComponent<DynamicMenuInterface>(
              dynamicMenu.component,
              {
                injector: Injector.create({
                  providers: dynamicMenu.data?.providers ?? [],
                  parent: this._injector,
                }),
              },
            );
          } else {
            this.dynamicMenu().viewContainerRef.clear();
          }
        }),
      );
  }
}
