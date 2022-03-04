import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
             selector: '[appDynamicMenu]',
           })
export class DynamicMenuDirective {
  constructor(public viewContainerRef: ViewContainerRef) {
  }
}
