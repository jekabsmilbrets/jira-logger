import { Service, Signal, signal } from '@angular/core';

import { DynamicMenu } from '@core/models/dynamic-menu';

@Service()
export class DynamicMenuService {
  private readonly dynamicMenusSignal = signal<DynamicMenu[]>([]);

  public get dynamicMenus(): Signal<DynamicMenu[]> {
    return this.dynamicMenusSignal.asReadonly();
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
