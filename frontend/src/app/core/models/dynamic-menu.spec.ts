import { DynamicMenu } from './dynamic-menu';

describe('Core Models dynamic-menu', () => {
  it('stores constructor arguments', () => {
    class FakeComponent {
    }

    const menu = new DynamicMenu(FakeComponent as any, {
      route: '/x',
      providers: [],
      extra: 1,
    });

    expect(menu.component).toBe(FakeComponent as any);
    expect(menu.data.route).toBe('/x');
    expect(menu.data.providers).toEqual([]);
    expect(menu.data['extra']).toBe(1);
  });
});
