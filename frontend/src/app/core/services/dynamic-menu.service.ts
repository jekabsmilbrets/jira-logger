import { inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { Observable } from 'rxjs';

import { DynamicMenu } from '@core/models/dynamic-menu';

@Injectable({
  providedIn: 'root',
})
export class DynamicMenuService {
  public readonly dynamicMenus$: Observable<DynamicMenu[]>;

  private readonly injector: Injector = inject(Injector);
  private readonly dynamicMenusSignal = signal<DynamicMenu[]>([]);

  public get dynamicMenus(): Signal<DynamicMenu[]> {
    return this.dynamicMenusSignal.asReadonly();
  }

  constructor() {
    this.dynamicMenus$ = toObservable(this.dynamicMenus, { injector: this.injector });
  }

  public addDynamicMenu(
    dynamicMenu: DynamicMenu,
  ): void {
    const currentDynamicMenus: DynamicMenu[] = this.dynamicMenusSignal();
    const dynamicMenuExists: boolean = currentDynamicMenus.findIndex(
      (cDM: DynamicMenu) => dynamicMenu.component === cDM.component,
    ) >= 0;

    if (!dynamicMenuExists) {
      this.dynamicMenusSignal.set([
        ...currentDynamicMenus,
        dynamicMenu,
      ]);
    }
  }
}
