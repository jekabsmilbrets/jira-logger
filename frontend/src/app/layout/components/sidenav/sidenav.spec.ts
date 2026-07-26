import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';

import { vi } from 'vitest';

import { Sidenav } from './sidenav';

@Component({
  template: '',
  standalone: true,
})
class DummyRoute {
}

describe('Layout Components sidenav', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidenav],
      providers: [provideRouter([
        { path: 'tasks/list', component: DummyRoute },
        { path: 'report', component: DummyRoute },
        { path: 'settings', component: DummyRoute },
      ])],
    }).compileComponents();
  });

  it('renders one nav link per navData item with visible labels', () => {
    const fixture = TestBed.createComponent(Sidenav);

    fixture.detectChanges();

    const navLinks: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a[mat-list-item]'),
    );

    expect(navLinks).toHaveLength(3);
    const navCaptions = Array.from(
      fixture.nativeElement.querySelectorAll('.nav-caption') as NodeListOf<HTMLElement>,
    );

    expect(navCaptions.map((caption) => caption.textContent?.trim()))
      .toEqual(['Task List', 'Report', 'Settings']);
  });

  it('binds each navigation route to routerLink', () => {
    const fixture = TestBed.createComponent(Sidenav);

    fixture.detectChanges();

    const routerLinks = fixture.debugElement.queryAll(By.directive(RouterLink));

    expect(routerLinks.map((link) => link.injector.get(RouterLink).href)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/tasks/list'),
        expect.stringContaining('/report'),
        expect.stringContaining('/settings'),
      ]),
    );
  });

  it('emits sidenavClose when a nav item is clicked', () => {
    const fixture = TestBed.createComponent(Sidenav);
    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn((component as never as { sidenavClose: { emit: () => void } }).sidenavClose, 'emit');

    fixture.detectChanges();

    const firstLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a[mat-list-item]');
    firstLink.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
