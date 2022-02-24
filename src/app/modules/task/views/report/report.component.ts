import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'app/modules/shared/shared.module';

import { take, tap, Subscription } from 'rxjs';

import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { ReportModeSwitcherComponent } from '@task/components/report-mode-switcher/report-mode-switcher.component';
import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { Task } from '@task/models/task.model';
import { ReportService } from '@task/services/report.service';
import { TasksService } from '@task/services/tasks.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit, AfterViewInit, OnDestroy {
  public dataSource: MatTableDataSource<Task> = new MatTableDataSource<Task>([]);

  public columns: string[] = [];

  @ViewChild(MatSort)
  private sort!: MatSort;
  @ViewChild(MatPaginator)
  private paginator!: MatPaginator;

  private tasksSubscription!: Subscription;

  private modeColumns: { [key: string]: string[] } = {
    total: [
      'name',
      'description',
      'timeLoggedToday',
    ],
  };

  constructor(
    private tasksService: TasksService,
    private dynamicMenuService: DynamicMenuService,
    private reportService: ReportService,
  ) {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        ReportModeSwitcherComponent,
        {
          route: '/tasks/report',
          providers: [
            {
              provide: ReportService,
              useValue: this.reportService,
            },
            SharedModule,
          ],
        },
      ),
    );

    this.tasksSubscription = this.tasksService.tasks$
                                 .pipe(
                                   tap((data: Task[]) => this.dataSource.data = data),
                                 )
                                 .subscribe();

    this.reportService.reportMode$
        .subscribe(
          (reportMode: ReportModeEnum) => this.columns = this.modeColumns[reportMode],
        );
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
