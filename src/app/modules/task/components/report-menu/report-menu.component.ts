import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { TaskTagsEnum }   from '@task/enums/task-tags.enum';
import { ReportService }  from '@task/services/report.service';

@Component({
             selector: 'app-report-menu',
             templateUrl: './report-menu.component.html',
             styleUrls: ['./report-menu.component.scss'],
           })
export class ReportMenuComponent {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<TaskTagsEnum[]>;

  constructor(
    private reportService: ReportService,
  ) {
    this.reportMode$ = this.reportService.reportMode$;
    this.tags$ = this.reportService.tags$;
  }

  public onReportModeChange(value: ReportModeEnum): void {
    this.reportService.reportMode = value;
  }

  public onTagChange(value: TaskTagsEnum[]): void {
    this.reportService.tags = value;
  }
}
