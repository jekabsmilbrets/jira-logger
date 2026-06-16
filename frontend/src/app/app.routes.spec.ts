import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, provideRouter, type Route, Router, RouterOutlet, type Routes } from '@angular/router';

import { describe, expect, it } from 'vitest';

import { HEADER_MENU_ROUTE_DATA_KEY, type HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

import { routes } from './app.routes';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RouterTestHostComponent {
}

describe('app.routes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestHostComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('redirects /tasks to /tasks/list', async () => {
    const router: Router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(RouterTestHostComponent);

    await router.navigateByUrl('/tasks');
    fixture.detectChanges();

    expect(router.url).toBe('/tasks/list');
  });

  it('navigates to /tasks/list and exposes the tasks header menu route data', async () => {
    const router: Router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(RouterTestHostComponent);

    await router.navigateByUrl('/tasks/list');
    fixture.detectChanges();

    expect(router.url).toBe('/tasks/list');
    expect(activeMenu(router.routerState.snapshot.root)?.menuId).toBe('tasks');
  });

  it('lazy-loads the report feature routes with the report header menu and expected child paths', async () => {
    const reportRoutes: Routes = await loadFeatureRoutes('report');
    const reportRootRoute: Route = reportRoutes[0]!;

    expect(reportRootRoute.data?.[HEADER_MENU_ROUTE_DATA_KEY]).toMatchObject({ menuId: 'report' });
    expect(reportRootRoute.children?.map((childRoute: Route) => childRoute.path)).toEqual([
      '',
      ':reportMode',
      ':reportMode/:date',
      '**',
    ]);
  });

  it('configures the report resolver on every concrete report route', async () => {
    const reportRoutes: Routes = await loadFeatureRoutes('report');
    const concreteReportRoutes: Route[] = reportRoutes[0]!.children!.filter((route: Route) => route.path !== '**');

    expect(concreteReportRoutes).toHaveLength(3);
    for (const route of concreteReportRoutes) {
      expect(route.resolve?.['settingsFromPath']).toBeTruthy();
    }
  });

  it('lazy-loads the settings feature routes without exposing a header menu', async () => {
    const settingsRoutes: Routes = await loadFeatureRoutes('settings');
    const settingsRootRoute: Route = settingsRoutes[0]!;

    expect(settingsRootRoute.data?.[HEADER_MENU_ROUTE_DATA_KEY]).toBeUndefined();
    expect(settingsRootRoute.children?.map((childRoute: Route) => childRoute.path)).toEqual(['', '**']);
  });
});

function activeMenu(routeSnapshot: ActivatedRouteSnapshot): HeaderMenuRouteData | null {
  let currentRoute: ActivatedRouteSnapshot | null = routeSnapshot;
  let resolvedMenu: HeaderMenuRouteData | null = null;

  while (currentRoute) {
    const routeMenu: HeaderMenuRouteData | undefined = currentRoute.routeConfig?.data?.[HEADER_MENU_ROUTE_DATA_KEY] as HeaderMenuRouteData | undefined;

    if (routeMenu) {
      resolvedMenu = routeMenu;
    }

    currentRoute = currentRoute.firstChild;
  }

  return resolvedMenu;
}

async function loadFeatureRoutes(path: string): Promise<Routes> {
  const shellRoute: Route | undefined = routes.find((route: Route) => route.loadComponent);
  const featureRoute: Route | undefined = shellRoute?.children?.find((route: Route) => route.path === path);
  const loadedChildren = await featureRoute?.loadChildren?.();
  const loadedRoutes: Routes | undefined = Array.isArray(loadedChildren) ? loadedChildren : undefined;

  expect(loadedRoutes).toBeTruthy();

  return loadedRoutes!;
}
