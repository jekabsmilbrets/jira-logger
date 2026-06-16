import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { describe, expect, it } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { TaskManagerService } from '@shared/services/task-manager.service';

import { HeaderComponent } from '@layout/components/header/header.component';
import { SidenavComponent } from '@layout/components/sidenav/sidenav.component';
import { HEADER_MENU_ROUTE_DATA_KEY, type HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

import { LayoutComponent } from './layout.component';

@Component({
  selector: 'layout-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class MockHeaderComponent {
  public readonly activeMenu = input<HeaderMenuRouteData | null>(null);
  public readonly activeTask = input<unknown>();
  public readonly isLoading = input<boolean>(false);
  public readonly sidenav = input<unknown>();
  public readonly timeLoggedToday = input<number>(0);
}

@Component({
  selector: 'layout-sidenav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class MockSidenavComponent {
  public readonly sidenavClose = output<void>();
}

@Component({
  selector: 'layout-test-route',
  standalone: true,
  template: '',
})
class DummyRouteComponent {
}

@Component({
  selector: 'layout-tasks-header-menu',
  standalone: true,
  template: '',
})
class TasksHeaderMenuComponent {
}

@Component({
  selector: 'layout-report-header-menu',
  standalone: true,
  template: '',
})
class ReportHeaderMenuComponent {
}

describe('Layout Views layout.component', () => {
  const isLoadingState = signal<boolean>(false);
  const activeTaskState = signal<unknown | null>(null);
  const timeLoggedTodayState = signal<number>(0);
  const tasksMenu: HeaderMenuRouteData = {
    menuId: 'tasks',
    menuComponent: TasksHeaderMenuComponent,
  };
  const reportMenu: HeaderMenuRouteData = {
    menuId: 'report',
    menuComponent: ReportHeaderMenuComponent,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([
          {
            path: 'tasks',
            data: {
              [HEADER_MENU_ROUTE_DATA_KEY]: tasksMenu,
            },
            children: [
              {
                path: 'list',
                component: DummyRouteComponent,
              },
            ],
          },
          {
            path: 'report',
            data: {
              [HEADER_MENU_ROUTE_DATA_KEY]: reportMenu,
            },
            children: [
              {
                path: '',
                component: DummyRouteComponent,
              },
              {
                path: ':reportMode',
                component: DummyRouteComponent,
              },
              {
                path: ':reportMode/:date',
                component: DummyRouteComponent,
              },
            ],
          },
          {
            path: 'settings',
            component: DummyRouteComponent,
          },
        ]),
        {
          provide: LoaderStateService,
          useValue: {
            isLoading: isLoadingState.asReadonly(),
          },
        },
        {
          provide: TaskManagerService,
          useValue: {
            activeTask: activeTaskState.asReadonly(),
            timeLoggedToday: timeLoggedTodayState.asReadonly(),
          },
        },
      ],
    })
      .overrideComponent(LayoutComponent, {
        remove: {
          imports: [HeaderComponent, SidenavComponent],
        },
        add: {
          imports: [MockHeaderComponent, MockSidenavComponent],
        },
      })
      .compileComponents();
  });

  it('renders the layout shell with header, sidenav, and routed content area', () => {
    const fixture = TestBed.createComponent(LayoutComponent);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.base-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('layout-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('layout-sidenav'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeTruthy();
  });

  it('passes signal values to the header inputs', () => {
    isLoadingState.set(true);
    activeTaskState.set({ name: 'TASK-1' });
    timeLoggedTodayState.set(321);

    const fixture = TestBed.createComponent(LayoutComponent);

    fixture.detectChanges();

    const headerDebugEl = fixture.debugElement.query(By.directive(MockHeaderComponent));
    const headerComponent = headerDebugEl.componentInstance as MockHeaderComponent;

    expect(headerComponent.isLoading()).toBe(true);
    expect(headerComponent.activeTask()).toEqual({ name: 'TASK-1' });
    expect(headerComponent.timeLoggedToday()).toBe(321);
    expect(headerComponent.sidenav()).toBeTruthy();
    expect(headerComponent.activeMenu()).toBeNull();
  });

  it('resolves the tasks menu from parent route metadata', async () => {
    const router: Router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(LayoutComponent);

    await router.navigateByUrl('/tasks/list');
    fixture.detectChanges();

    const headerDebugEl = fixture.debugElement.query(By.directive(MockHeaderComponent));
    const headerComponent = headerDebugEl.componentInstance as MockHeaderComponent;

    expect(headerComponent.activeMenu()).toEqual(tasksMenu);
  });

  it('resolves the report menu for descendant report routes', async () => {
    const router: Router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(LayoutComponent);

    await router.navigateByUrl('/report/date/2026-06-16');
    fixture.detectChanges();

    const headerDebugEl = fixture.debugElement.query(By.directive(MockHeaderComponent));
    const headerComponent = headerDebugEl.componentInstance as MockHeaderComponent;

    expect(headerComponent.activeMenu()).toEqual(reportMenu);
  });

  it('passes no active menu when the active route has no header menu metadata', async () => {
    const router: Router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(LayoutComponent);

    await router.navigateByUrl('/settings');
    fixture.detectChanges();

    const headerDebugEl = fixture.debugElement.query(By.directive(MockHeaderComponent));
    const headerComponent = headerDebugEl.componentInstance as MockHeaderComponent;

    expect(headerComponent.activeMenu()).toBeNull();
  });
});

describe('Layout Views layout.component integration', () => {
  it('renders real template structure with real imports', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [LayoutComponent],
        providers: [
          provideRouter([]),
          { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly() } },
          {
            provide: TaskManagerService,
            useValue: {
              activeTask: signal<unknown | null>(null).asReadonly(),
              timeLoggedToday: signal<number>(0).asReadonly(),
            },
          },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.base-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('layout-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('layout-sidenav'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('mat-sidenav-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeTruthy();
  });
});
