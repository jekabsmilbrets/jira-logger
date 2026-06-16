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

import { DynamicMenuDirective } from '@core/directives/dynamic-menu.directive';

import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import type { HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

@Component({
  selector: 'layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatButtonModule, RouterLink, MatIconModule, ReadableTimePipe, DynamicMenuDirective, MatProgressBarModule],
})
export class HeaderComponent implements AfterViewInit {
  public readonly activeMenu: InputSignal<HeaderMenuRouteData | null> = input<HeaderMenuRouteData | null>(null);
  public readonly sidenav: InputSignal<MatSidenav> = input.required<MatSidenav>();
  public readonly activeTask: InputSignal<null | Task> = input.required<Task | null>();
  public readonly isLoading: InputSignal<boolean> = input(false);
  public readonly timeLoggedToday: InputSignal<number> = input(0);

  private readonly injector: Injector = inject(Injector);

  private readonly dynamicMenu: Signal<DynamicMenuDirective> = viewChild.required(DynamicMenuDirective);

  protected reportDateLink(): string {
    const date: Date = new Date();
    const pad: (numberToPad: number) => string = (
      numberToPad: number,
    ) => numberToPad.toString().padStart(2, '0');
    const currentDate: string = `${ date.getFullYear() }-${ pad(date.getMonth() + 1) }-${ pad(date.getDate()) }`;
    return `/report/date/${ currentDate }`;
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
