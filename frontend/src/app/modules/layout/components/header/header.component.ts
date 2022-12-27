import { Component, Injector, Input, OnDestroy, ViewChild } from '@angular/core';
import { MatSidenav }                                       from '@angular/material/sidenav';
import { NavigationEnd, Router }                            from '@angular/router';

import { delay, filter, Observable, Subscription, switchMap, take, tap } from 'rxjs';

import { DynamicMenuDirective } from '@core/directives/dynamic-menu.directive';
import { DynamicMenuInterface } from '@core/interfaces/dynamic-menu.interface';
import { DynamicMenu }          from '@core/models/dynamic-menu';
import { DynamicMenuService }   from '@core/services/dynamic-menu.service';

import { Task } from '@shared/models/task.model';


@Component(
  {
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
  },
)
export class HeaderComponent implements OnDestroy {
  @Input()
  public sidenav!: MatSidenav;

  @Input()
  public activeTask!: Task | null;

  @Input()
  public isLoading = false;

  @Input()
  public timeLoggedToday = 0;

  @ViewChild(DynamicMenuDirective, {static: true})
  private dynamicMenu!: DynamicMenuDirective;

  private routerEventsSubscription: Subscription;

  constructor(
    private dynamicMenuService: DynamicMenuService,
    private router: Router,
    private _injector: Injector,
  ) {
    this.routerEventsSubscription = this.router.events
      .pipe(
        filter(
          (e): e is NavigationEnd => e instanceof NavigationEnd,
        ),
        delay(100), // hax :D :D without it loadingDynamicMenu causes loading empty dynamic menus
        switchMap(
          (navigationEndEvent: NavigationEnd) => this.loadDynamicMenu(navigationEndEvent),
        ),
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
  }

  public reportDateLink() {
    const date = new Date();
    const pad = (numberToPad: number) => numberToPad.toString().padStart(2, '0');
    const currentDate = `${ date.getFullYear() }-${ pad(date.getMonth() + 1) }-${ pad(date.getDate()) }`;
    return `/report/date/${ currentDate }`;
  }

  private loadDynamicMenu(navigationEndEvent: NavigationEnd): Observable<DynamicMenu[]> {
    return this.dynamicMenuService.dynamicMenus$
      .pipe(
        take(1),
        tap(
          (dynamicMenus: DynamicMenu[]) => {
            const dynamicMenu: DynamicMenu | undefined = dynamicMenus.find(
              (dM: DynamicMenu) => navigationEndEvent.urlAfterRedirects.includes(dM.data.route),
            );

            if (dynamicMenu) {
              const viewContainerRef = this.dynamicMenu.viewContainerRef;
              viewContainerRef.clear();

              viewContainerRef.createComponent<DynamicMenuInterface>(
                dynamicMenu.component,
                {
                  injector: Injector.create(
                    {
                      providers: dynamicMenu.data?.providers ?? [],
                      parent: this._injector,
                    },
                  ),
                },
              );
            } else {
              this.dynamicMenu.viewContainerRef.clear();
            }
          },
        ),
      );
  }
}
