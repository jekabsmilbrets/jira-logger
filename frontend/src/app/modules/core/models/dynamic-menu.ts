import { Type } from '@angular/core';


export class DynamicMenu {
  constructor(
    public component: Type<any>,
    public data: {
      [key: string]: any;
      route: string;
      providers: any[];
    },
  ) {
  }
}
