import { Component } from '@angular/core';

import { BehaviorSubject, catchError, interval, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task }         from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';


@Component(
  {
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
  },
)
export class LayoutComponent {
  public isLoading$!: Observable<boolean>;
  public timeLoggedToday$: Observable<number>;

  private timeLoggedTodaySubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  constructor(
    private loaderStateService: LoaderStateService,
    private tasksService: TasksService,
  ) {
    this.isLoading$ = this.loaderStateService.isLoading$;
    this.timeLoggedToday$ = this.timeLoggedTodaySubject.asObservable();
    this.getTimeLoggedToday()
      .pipe(
        take(1),
      )
      .subscribe();

    interval(10000)
      .pipe(
        switchMap(
          () => this.getTimeLoggedToday()),
      )
      .subscribe();
  }

  public get date() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    return date;
  };

  private getTimeLoggedToday(): Observable<number> {
    return this.tasksService.filteredList({
      date: this.date,
    })
      .pipe(
        catchError(() => of([])),
        map((tasks: Task[]) =>
          tasks.map((task: Task) => task.calcTimeLoggedForDate(this.date))
            .reduce((acc: number, value: number) => acc + value, 0)),
        tap((timeLoggedToday: number) => this.timeLoggedTodaySubject.next(timeLoggedToday)),
      );
  }
}
