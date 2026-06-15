import { Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { DynamicMenu } from '@core/models/dynamic-menu';

@Service()
export class DynamicMenuService {
  private readonly dynamicMenusSignal: WritableSignal<DynamicMenu[]> = signal<DynamicMenu[]>([]);

  public readonly dynamicMenus: Signal<DynamicMenu[]> = this.dynamicMenusSignal.asReadonly();

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
