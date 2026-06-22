import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { describe, expect, it, vi } from 'vitest';

import type { HeaderMenuRouteData } from '@layout/interfaces/header-menu-route-data.interface';

import { HeaderComponent } from './header.component';

@Component({
  standalone: true,
  template: '',
})
class DummyDynamicMenuComponent {
}

describe('Layout Components header.component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
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

  it('renders long active task text in the shrinkable toolbar slot', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.componentRef.setInput('activeTask', {
      name: 'Very long active task name that should truncate instead of pushing header actions out of view',
    });
    fixture.detectChanges();

    const activeTaskElement: HTMLElement = fixture.nativeElement.querySelector('.active-task');
    const dynamicMenuElement: HTMLElement = fixture.nativeElement.querySelector('.dynamic-menu');
    const activeTaskStyle = getComputedStyle(activeTaskElement);

    expect(activeTaskElement.textContent?.trim()).toContain('Very long active task name');
    expect(activeTaskStyle.minWidth).toBe('0px');
    expect(activeTaskStyle.overflow).toBe('hidden');
    expect(activeTaskStyle.textOverflow).toBe('ellipsis');
    expect(dynamicMenuElement).not.toBeNull();
  });

  it('shows loading indicator only when isLoading is true', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('mat-progress-bar'))).toBeNull();

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-progress-bar'))).not.toBeNull();
  });

  it('renders report date link for today', () => {
    const { fixture } = createComponentWithRequiredInputs();

    fixture.detectChanges();

    const timeSpentLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a.time-spent');

    expect(timeSpentLink.getAttribute('href')).toMatch(/^\/report\/date\/\d{4}-\d{2}-\d{2}$/);
  });

  it('clears dynamic menu container when no active menu is provided', () => {
    const { fixture } = createComponentWithRequiredInputs();
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

    fixture.detectChanges();

    expect(clear).toHaveBeenCalled();
    expect(createComponent).not.toHaveBeenCalled();
  });

  it('creates dynamic menu component when active menu is provided', () => {
    const { fixture } = createComponentWithRequiredInputs();
    const component = fixture.componentInstance as any;
    const clear = vi.fn();
    const createComponent = vi.fn();
    const activeMenu: HeaderMenuRouteData = {
      menuId: 'tasks',
      menuComponent: DummyDynamicMenuComponent,
    };

    Object.defineProperty(component, 'dynamicMenu', {
      value: () => ({
        viewContainerRef: {
          clear,
          createComponent,
        },
      }),
    });

    fixture.componentRef.setInput('activeMenu', activeMenu);
    fixture.detectChanges();

    expect(clear).toHaveBeenCalled();
    expect(createComponent).toHaveBeenCalledWith(DummyDynamicMenuComponent);
  });
});
