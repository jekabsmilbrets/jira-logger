import { Type } from '@angular/core';

export const HEADER_MENU_ROUTE_DATA_KEY: string = 'headerMenu';

export interface HeaderMenuRouteData {
  menuId: string;
  menuComponent: Type<unknown>;
}
