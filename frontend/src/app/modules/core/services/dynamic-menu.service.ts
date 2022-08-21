import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { DynamicMenu } from '@core/models/dynamic-menu';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class DynamicMenuService {
  public dynamicMenus$: Observable<DynamicMenu[]>;

  private dynamicMenusSubject: BehaviorSubject<DynamicMenu[]> = new BehaviorSubject<DynamicMenu[]>([]);

  constructor() {
    this.dynamicMenus$ = this.dynamicMenusSubject.asObservable();
  }

  public addDynamicMenu(
    dynamicMenu: DynamicMenu,
  ): void {
    const currentDynamicMenus = this.dynamicMenusSubject.getValue();
    const dynamicMenuExists = currentDynamicMenus.findIndex(
      (cDM: DynamicMenu) => dynamicMenu.component === cDM.component,
    ) >= 0;

    if (!dynamicMenuExists) {
      currentDynamicMenus.push(dynamicMenu);

      this.dynamicMenusSubject.next(currentDynamicMenus);
    }
  }
}
