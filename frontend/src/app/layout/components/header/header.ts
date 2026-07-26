import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  InputSignal,
  Signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';

import { DynamicMenu } from '@core/directives/dynamic-menu';

import { Task } from '@shared/models/task.model';
import { ReadableTime } from '@shared/pipes/readable-time';

import { ReportDateCalendar } from '@report/services/report-date-calendar';

import type { HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

@Component({
  selector: 'layout-header',
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatButtonModule, RouterLink, MatIconModule, ReadableTime, DynamicMenu, MatProgressBarModule],
})
export class Header implements AfterViewInit {
  public readonly activeMenu: InputSignal<HeaderMenuRouteData | null> = input<HeaderMenuRouteData | null>(null);
  public readonly sidenav: InputSignal<MatSidenav> = input.required<MatSidenav>();
  public readonly activeTask: InputSignal<null | Task> = input.required<Task | null>();
  public readonly isLoading: InputSignal<boolean> = input(false);
  public readonly timeLoggedToday: InputSignal<number> = input(0);

  private readonly injector: Injector = inject(Injector);
  private readonly reportDateCalendarService: ReportDateCalendar = inject(ReportDateCalendar);

  private readonly dynamicMenu: Signal<DynamicMenu> = viewChild.required(DynamicMenu);

  protected reportDateLink(): string {
    return this.reportDateCalendarService.todayRouteLink();
  }

  public ngAfterViewInit(): void {
    effect(() => {
      const viewContainerRef: ViewContainerRef = this.dynamicMenu().viewContainerRef;
      const activeMenu: HeaderMenuRouteData | null = this.activeMenu();

      viewContainerRef.clear();

      if (activeMenu) {
        viewContainerRef.createComponent(activeMenu.menuComponent);
      }
    }, { injector: this.injector });
  }
}
