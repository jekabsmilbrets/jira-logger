import { TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter } from '@angular/router';

import { DynamicMenuService } from '@core/services/dynamic-menu.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { HeaderComponent } from './header.component';

describe('Layout Components header.component', () => {
  const dynamicMenusSubject = new BehaviorSubject<any[]>([]);

  beforeEach(async () => {
    dynamicMenusSubject.next([]);
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: DynamicMenuService,
          useValue: {
            dynamicMenus$: dynamicMenusSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();
  });

  function createComponentWithRequiredInputs(): {
    fixture: ReturnType<typeof TestBed.createComponent<HeaderComponent>>;
    sidenav: MatSidenav;
  } {
    const fixture = TestBed.createComponent(HeaderComponent);
    const sidenav = {
      toggle: vi.fn(),
    } as unknown as MatSidenav;

    fixture.componentRef.setInput('sidenav', sidenav);
    fixture.componentRef.setInput('activeTask', null);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('timeLoggedToday', 0);

    return { fixture, sidenav };
  }

  it('toggles sidenav when the menu button is clicked', () => {
    const { fixture, sidenav } = createComponentWithRequiredInputs();

    fixture.detectChanges();

    const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-menu');
    menuButton.click();

    expect(sidenav.toggle).toHaveBeenCalledTimes(1);
  });

  it('renders active task name only when activeTask is provided', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.active-task'))).toBeNull();

    fixture.componentRef.setInput('activeTask', { name: 'Build report' });
    fixture.detectChanges();

    const activeTaskElement: HTMLElement | null = fixture.nativeElement.querySelector('.active-task');

    expect(activeTaskElement?.textContent?.trim()).toBe('Build report');
  });

  it('shows loading indicator only when isLoading is true', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeNull();

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeTruthy();
  });

  it('renders a date-based report link in the toolbar', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.detectChanges();

    const timeSpentLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a.time-spent');

    expect(timeSpentLink.getAttribute('href')).toMatch(/^\/report\/date\/\d{4}-\d{2}-\d{2}$/);
  });

  it('clears dynamic menu container when no menu matches current route', async () => {
    const { fixture } = createComponentWithRequiredInputs();
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const clear = vi.fn();
    const createComponent = vi.fn();

    Object.defineProperty(component, 'dynamicMenu', {
      value: () => ({
        viewContainerRef: {
          clear,
          createComponent,
        },
      }),
    });

    dynamicMenusSubject.next([{
      data: { route: '/other' }, component: class Dummy {
      },
    }]);
    await firstValueFrom(component['loadDynamicMenu'](new NavigationEnd(1, '/tasks', '/tasks')));

    expect(clear).toHaveBeenCalled();
    expect(createComponent).not.toHaveBeenCalled();
  });

  it('creates dynamic menu component when route matches', async () => {
    const { fixture } = createComponentWithRequiredInputs();
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const clear = vi.fn();
    const createComponent = vi.fn();

    class DummyDynamicComponent {
    }

    Object.defineProperty(component, 'dynamicMenu', {
      value: () => ({
        viewContainerRef: {
          clear,
          createComponent,
        },
      }),
    });

    dynamicMenusSubject.next([{ data: { route: '/tasks', providers: [] }, component: DummyDynamicComponent }]);
    await firstValueFrom(component['loadDynamicMenu'](new NavigationEnd(1, '/tasks', '/tasks/list')));

    expect(clear).toHaveBeenCalled();
    expect(createComponent).toHaveBeenCalledWith(
      DummyDynamicComponent,
      expect.objectContaining({ injector: expect.any(Object) }),
    );
  });

  it('unsubscribes router subscription on destroy', () => {
    const { fixture } = createComponentWithRequiredInputs();
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const unsub = vi.spyOn(component['routerEventsSubscription'], 'unsubscribe');

    component.ngOnDestroy();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
