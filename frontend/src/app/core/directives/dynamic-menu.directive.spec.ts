import { Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DynamicMenuDirective } from './dynamic-menu.directive';

@Component({
  template: '<ng-container appDynamicMenu></ng-container>',
  imports: [DynamicMenuDirective],
})
class HostComponent {
  @ViewChild(DynamicMenuDirective)
  directive!: DynamicMenuDirective;
}

describe('Core Directives dynamic-menu.directive', () => {
  it('injects view container ref', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [HostComponent],
    }).createComponent(HostComponent);

    fixture.detectChanges();

    expect(fixture.componentInstance.directive.viewContainerRef).toBeTruthy();
  });
});
