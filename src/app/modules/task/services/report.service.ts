import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { TaskTagsEnum }   from '@task/enums/task-tags.enum';

@Injectable()
export class ReportService {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<TaskTagsEnum[]>;

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);
  private tagsSubject: BehaviorSubject<TaskTagsEnum[]> = new BehaviorSubject<TaskTagsEnum[]>(
    [
      TaskTagsEnum.capex,
      TaskTagsEnum.opex,
      TaskTagsEnum.other,
    ],
  );

  constructor() {
    this.reportMode$ = this.reportModeSubject.asObservable();
    this.tags$ = this.tagsSubject.asObservable();
  }

  public set reportMode(mode: ReportModeEnum) {
    this.reportModeSubject.next(mode);
  }

  public set tags(tags: TaskTagsEnum[]) {
    this.tagsSubject.next(tags);
  }
}
