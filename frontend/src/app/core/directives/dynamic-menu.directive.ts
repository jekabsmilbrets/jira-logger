import { Directive, inject, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appDynamicMenu]',
  standalone: true,
})
export class DynamicMenuDirective {
  public readonly viewContainerRef: ViewContainerRef = inject(ViewContainerRef);
}
