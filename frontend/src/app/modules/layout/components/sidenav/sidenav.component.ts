import { Component, EventEmitter, Output } from '@angular/core';

import { SideNavInterface } from '@layout/interfaces/side-nav.interface';

@Component(
  {
    selector: 'layout-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
    standalone: false,
  },
)
export class SidenavComponent {
  @Output()
  public sidenavClose: EventEmitter<void> = new EventEmitter<void>();

  public navData: SideNavInterface[] = [
    {
      route: '/tasks/list',
      icon: 'list',
      name: 'Task List',
    },
    {
      route: '/report',
      icon: 'report',
      name: 'Report',
    },
    {
      route: '/settings',
      icon: 'settings',
      name: 'Settings',
    },
  ];

  public onSidenavClose(): void {
    this.sidenavClose.emit();
  }
}
