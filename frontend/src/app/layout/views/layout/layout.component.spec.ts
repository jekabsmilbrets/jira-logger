import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { BehaviorSubject } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { TaskManagerService } from '@shared/services/task-manager.service';

import { HeaderComponent } from '@layout/components/header/header.component';
import { SidenavComponent } from '@layout/components/sidenav/sidenav.component';

import { LayoutComponent } from './layout.component';

@Component({
  selector: 'layout-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class MockHeaderComponent {
  @Input() public activeTask: unknown;
  @Input() public isLoading: boolean = false;
  @Input() public sidenav: unknown;
  @Input() public timeLoggedToday: number = 0;
}

@Component({
  selector: 'layout-sidenav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class MockSidenavComponent {
  @Output() public sidenavClose: EventEmitter<void> = new EventEmitter<void>();
}

describe('Layout Views layout.component', () => {
  const isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  const activeTaskSubject: BehaviorSubject<unknown | null> = new BehaviorSubject<unknown | null>(null);
  const timeLoggedTodaySubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        {
          provide: LoaderStateService,
          useValue: {
            isLoading$: isLoadingSubject.asObservable(),
          },
        },
        {
          provide: TaskManagerService,
          useValue: {
            activeTask$: activeTaskSubject.asObservable(),
            timeLoggedToday$: timeLoggedTodaySubject.asObservable(),
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

  it('passes observable values to the header inputs', () => {
    isLoadingSubject.next(true);
    activeTaskSubject.next({ name: 'TASK-1' });
    timeLoggedTodaySubject.next(321);

    const fixture = TestBed.createComponent(LayoutComponent);

    fixture.detectChanges();

    const headerDebugEl = fixture.debugElement.query(By.directive(MockHeaderComponent));
    const headerComponent = headerDebugEl.componentInstance as MockHeaderComponent;

    expect(headerComponent.isLoading).toBe(true);
    expect(headerComponent.activeTask).toEqual({ name: 'TASK-1' });
    expect(headerComponent.timeLoggedToday).toBe(321);
    expect(headerComponent.sidenav).toBeTruthy();
  });

});

describe('Layout Views layout.component integration', () => {
  it('renders real template structure with real imports', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [LayoutComponent],
        providers: [
          provideRouter([]),
          { provide: LoaderStateService, useValue: { isLoading$: new BehaviorSubject<boolean>(false).asObservable() } },
          {
            provide: TaskManagerService,
            useValue: {
              activeTask$: new BehaviorSubject<unknown | null>(null).asObservable(),
              timeLoggedToday$: new BehaviorSubject<number>(0).asObservable(),
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
