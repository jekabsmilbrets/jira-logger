import { Injectable } from '@angular/core';

import { DynamicMenu } from '@core/models/dynamic-menu';

import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DynamicMenuService {
  public dynamicMenus$: Observable<DynamicMenu[]>;

  private dynamicMenusSubject: BehaviorSubject<DynamicMenu[]> = new BehaviorSubject<DynamicMenu[]>([]);

  constructor() {
    this.dynamicMenus$ = this.dynamicMenusSubject.asObservable();
  }

  public addDynamicMenu(
    dynamicMenu: DynamicMenu,
  ): void {
    const currentDynamicMenus: DynamicMenu[] = this.dynamicMenusSubject.getValue();
    const dynamicMenuExists: boolean = currentDynamicMenus.findIndex(
      (cDM: DynamicMenu) => dynamicMenu.component === cDM.component,
    ) >= 0;

    if (!dynamicMenuExists) {
      currentDynamicMenus.push(dynamicMenu);

      this.dynamicMenusSubject.next(currentDynamicMenus);
    }
  }
}
