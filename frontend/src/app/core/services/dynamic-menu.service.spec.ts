import { TestBed } from '@angular/core/testing';

import { DynamicMenu } from '@core/models/dynamic-menu';

import { DynamicMenuService } from './dynamic-menu.service';

describe('Core Services dynamic-menu.service', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [DynamicMenuService],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds only unique dynamic menus by component', () => {
    class C1 {
    }

    class C2 {
    }

    const service = TestBed.inject(DynamicMenuService);
    const values: DynamicMenu[][] = [];

    service.dynamicMenus$.subscribe((v) => values.push(v));

    service.addDynamicMenu(new DynamicMenu(C1 as any, { route: '/a', providers: [] }));
    service.addDynamicMenu(new DynamicMenu(C2 as any, { route: '/b', providers: [] }));
    service.addDynamicMenu(new DynamicMenu(C1 as any, { route: '/b', providers: [] }));

    expect(values.at(-1)).toHaveLength(2);
    expect(values.at(-1)?.[0].data.route).toBe('/a');
    expect(values.at(-1)?.[1].data.route).toBe('/b');
  });
});
