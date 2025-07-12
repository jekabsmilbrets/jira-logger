import { Component, output, OutputEmitterRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListItem, MatNavList } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SideNavInterface } from '@layout/interfaces/side-nav.interface';

@Component({
  selector: 'layout-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [
    MatNavList,
    MatListItem,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
  ],
})
export class SidenavComponent {
  protected readonly sidenavClose: OutputEmitterRef<void> = output<void>();

  protected navData: SideNavInterface[] = [
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

  protected onSidenavClose(): void {
    this.sidenavClose.emit();
  }
}
