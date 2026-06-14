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
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { DynamicMenuDirective } from '@core/directives/dynamic-menu.directive';
import { DynamicMenuInterface } from '@core/interfaces/dynamic-menu.interface';
import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

@Component({
  selector: 'layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatButtonModule, RouterLink, MatIconModule, ReadableTimePipe, DynamicMenuDirective, MatProgressBarModule],
})
export class HeaderComponent implements AfterViewInit {
  public readonly sidenav: InputSignal<MatSidenav> = input.required<MatSidenav>();
  public readonly activeTask: InputSignal<null | Task> = input.required<Task | null>();
  public readonly isLoading: InputSignal<boolean> = input(false);
  public readonly timeLoggedToday: InputSignal<number> = input(0);

  private readonly dynamicMenuService: DynamicMenuService = inject(DynamicMenuService);
  private readonly router: Router = inject(Router);
  private readonly _injector: Injector = inject(Injector);

  private readonly dynamicMenu: Signal<DynamicMenuDirective> = viewChild.required(DynamicMenuDirective);
  private readonly dynamicMenus = this.dynamicMenuService.dynamicMenus;
  private readonly activeRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

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
      const dynamicMenu: DynamicMenu | undefined = this.dynamicMenus().find(
        (menu: DynamicMenu) => this.activeRoute().includes(menu.data.route),
      );
      const viewContainerRef: ViewContainerRef = this.dynamicMenu().viewContainerRef;

      viewContainerRef.clear();

      if (dynamicMenu) {
        viewContainerRef.createComponent<DynamicMenuInterface>(
          dynamicMenu.component as never,
          {
            injector: Injector.create({
              providers: dynamicMenu.data?.providers ?? [],
              parent: this._injector,
            }),
          },
        );
      }
    }, { injector: this._injector });
  }
}
