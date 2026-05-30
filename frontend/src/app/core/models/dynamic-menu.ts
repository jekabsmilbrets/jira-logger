import { Provider, Type } from '@angular/core';

export class DynamicMenu {
  constructor(
    public component: Type<unknown>,
    public data: {
      [key: string]: unknown;
      route: string;
      providers: Provider[];
    },
  ) {
  }
}
