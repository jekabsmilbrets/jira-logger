import { Component, Input, ViewChild, OnDestroy, Injector } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

import { Router, NavigationEnd } from '@angular/router';

import { Subscription, filter, switchMap, take, tap, Observable, delay } from 'rxjs';

import { DynamicMenuDirective } from '@core/directives/dynamic-menu.directive';
import { DynamicMenuInterface } from '@core/interfaces/dynamic-menu.interface';
import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnDestroy {
  @Input()
  public sidenav!: MatSidenav;

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

  private loadDynamicMenu(navigationEndEvent: NavigationEnd): Observable<DynamicMenu[]> {
    return this.dynamicMenuService.dynamicMenus$
               .pipe(
                 take(1),
                 tap(
                   (dynamicMenus: DynamicMenu[]) => {
                     const dynamicMenu: DynamicMenu | undefined = dynamicMenus.find(
                       (dM: DynamicMenu) => dM.data.route === navigationEndEvent.url,
                     );

                     if (dynamicMenu) {
                       const viewContainerRef = this.dynamicMenu.viewContainerRef;
                       viewContainerRef.clear();

                       viewContainerRef.createComponent<DynamicMenuInterface>(
                         dynamicMenu.component,
                         {
                           injector: Injector.create(
                             {
                               providers: dynamicMenu?.data?.providers ?? [],
                               parent: this._injector,
                             },
                           ),
                         },
                       );
                     } else {
                       const viewContainerRef = this.dynamicMenu.viewContainerRef;
                       viewContainerRef.clear();
                     }
                   },
                 ),
               );
  }
}
