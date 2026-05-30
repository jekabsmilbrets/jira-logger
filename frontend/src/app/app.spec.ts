import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';

import { App } from './app';

describe('App.spec.ts app', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a router outlet as the app shell', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(RouterOutlet))).toBeTruthy();
  });
});
