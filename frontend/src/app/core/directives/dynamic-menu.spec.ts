import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DynamicMenu } from './dynamic-menu';

@Component({
  template: '<ng-container appDynamicMenu />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DynamicMenu],
})
class Host {
  readonly directive = viewChild.required(DynamicMenu);
}

describe('Core Directives dynamic-menu', () => {
  it('injects view container ref', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [Host],
    }).createComponent(Host);

    fixture.detectChanges();

    expect(fixture.componentInstance.directive().viewContainerRef).toBeTruthy();
  });
});
