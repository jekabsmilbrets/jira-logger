import { Clipboard }                    from '@angular/cdk/clipboard';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar }                  from '@angular/material/snack-bar';
import { ActivatedRoute, ParamMap }     from '@angular/router';

import { Observable, Subscription } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column }     from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';

import { Task }             from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { SharedModule }     from '@shared/shared.module';

import { ReportMenuComponent } from '@report/components/report-menu/report-menu.component';
import { ReportModeEnum }      from '@report/enums/report-mode.enum';
import { ReportService }       from '@report/services/report.service';


@Component(
  {
    selector: 'app-report-view',
    templateUrl: './report-view.component.html',
    styleUrls: ['./report-view.component.scss'],
  },
)
export class ReportViewComponent implements OnInit, OnDestroy {
  public tasks$!: Observable<Task[]>;

  private subscriptions: Subscription[] = [];

  constructor(
    private dynamicMenuService: DynamicMenuService,
    private reportService: ReportService,
    private activatedRoute: ActivatedRoute,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
  ) {
    this.subscriptions.push(
      this.activatedRoute.paramMap
        .pipe()
        .subscribe(
          (params: ParamMap) => {
            if (params.has('reportMode')) {
              const reportMode = params.get('reportMode') as string;

              if (reportMode in ReportModeEnum) {
                this.reportService.reportMode = ReportModeEnum[reportMode as keyof typeof ReportModeEnum];
              } else {
                this.reportService.reportMode = ReportModeEnum.total;
              }
            }
          },
        ),
    );

    this.tasks$ = this.reportService.tasks$;
  }

  public get columns(): Column[] {
    return this.reportService.columns;
  }

  public ngOnInit(): void {
    this.createDynamicMenu();
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  public onCellClick([row, column]: [Searchable, Column]): void {
    const task = row as Task;
    let outputValue;
    let message;

    switch (column.cellClickType) {
      case 'readableTime':
        const timeLogged: number = column.cell(task);
        const readableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!`;
        break;

      case 'string':
      case undefined:
      default:
        outputValue = column.cell(task);
        message = `Copied Task "${ task.name }" field "${ column.header }" value to clipboard "${ outputValue }"!`;
        break;
    }

    this.clipboard.copy(outputValue);
    this.snackBar.open(
      message,
      undefined,
      {
        duration: 5000,
      },
    );
  }

  public onFooterCellClicked([rows, column]: [Searchable[], Column]): void {
    const tasks = rows as Task[];
    let outputValue;
    let message;

    switch (column.footerCellClickType) {
      case 'readableTime':
        const timeLogged: number = column.footerCell(tasks);
        const readableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied logged time to clipboard "${ outputValue }"!`;
        break;

      case 'concatenatedString':
      case undefined:
      default:
        outputValue = tasks.map((task: Task) => column.cell(task)).join(', ');
        message = `Copied field "${ column.header }" value to clipboard "${ outputValue }"!`;
        break;
    }

    this.clipboard.copy(outputValue);
    this.snackBar.open(
      message,
      undefined,
      {
        duration: 5000,
      },
    );
  }

  private createDynamicMenu(): void {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        ReportMenuComponent,
        {
          route: '/report',
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
  }
}
