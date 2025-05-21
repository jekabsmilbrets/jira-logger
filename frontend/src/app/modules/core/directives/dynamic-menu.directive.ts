import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appDynamicMenu]',
  standalone: false,
})
export class DynamicMenuDirective {
  constructor(
    public viewContainerRef: ViewContainerRef,
  ) {
  }
}
