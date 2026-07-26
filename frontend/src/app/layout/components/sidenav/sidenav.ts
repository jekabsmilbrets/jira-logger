import { ChangeDetectionStrategy, Component, output, type OutputEmitterRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListItem, MatNavList } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { SideNav } from '@layout/interfaces/side-nav.interface';

@Component({
  selector: 'layout-sidenav',
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatNavList,
    MatListItem,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
  ],
})
export class Sidenav {
  protected readonly sidenavClose: OutputEmitterRef<void> = output<void>();

  protected navData: SideNav[] = [
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
