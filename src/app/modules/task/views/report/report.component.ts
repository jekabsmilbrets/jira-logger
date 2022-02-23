import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { take, tap, Subscription } from 'rxjs';

import { DynamicMenu } from '@core/models/dynamic-menu';

import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { ReportModeSwitcherComponent } from '@task/components/report-mode-switcher/report-mode-switcher.component';


import { Task } from '@task/models/task.model';

import { TasksService } from '@task/services/tasks.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit, AfterViewInit, OnDestroy {
  public dataSource: MatTableDataSource<Task> = new MatTableDataSource<Task>([]);

  @ViewChild(MatSort)
  private sort!: MatSort;
  @ViewChild(MatPaginator)
  private paginator!: MatPaginator;

  private tasksSubscription!: Subscription;

  constructor(
    private tasksService: TasksService,
    private dynamicMenuService: DynamicMenuService,
  ) {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        ReportModeSwitcherComponent,
        {
          route: '/tasks/report',
        },
      ),
    );
    this.tasksSubscription = this.tasksService.tasks$
                                 .pipe(
                                   tap((data: Task[]) => this.dataSource.data = data),
                                 )
                                 .subscribe();
  }

  public ngOnInit(): void {
    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  public ngOnDestroy(): void {
    this.tasksSubscription.unsubscribe();
  }
}
