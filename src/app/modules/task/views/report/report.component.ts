import { Component, OnInit } from '@angular/core';

import { SharedModule } from 'app/modules/shared/shared.module';

import { take, Observable } from 'rxjs';

import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column } from '@shared/interfaces/column.interface';

import { ReportModeSwitcherComponent } from '@task/components/report-mode-switcher/report-mode-switcher.component';
import { columns as totalModelColumns } from '@task/constants/report-total-columns.constant';
import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { Task } from '@task/models/task.model';
import { ReportService } from '@task/services/report.service';
import { TasksService } from '@task/services/tasks.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit {
  public tasks$: Observable<Task[]>;
  public columns: Column[] = [];

  private modeColumns: { [key: string]: Column[] } = {
    total: totalModelColumns,
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

    this.tasks$ = this.tasksService.tasks$;

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
}
