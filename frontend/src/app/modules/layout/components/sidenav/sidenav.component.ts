import { Component, EventEmitter, Output } from '@angular/core';

import { SideNavInterface } from '@layout/interfaces/side-nav.interface';


@Component(
  {
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
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
  ];

  public onSidenavClose(): void {
    this.sidenavClose.emit();
  }
}
