import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { defaultTaskFilterTags } from '@task/constants/default-tags.constants';

import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { TaskTagsEnum }   from '@task/enums/task-tags.enum';

@Injectable()
export class ReportService {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<TaskTagsEnum[]>;
  public startDate$: Observable<Date>;
  public endDate$: Observable<Date>;
  public showWeekends$: Observable<boolean>;

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);
  private tagsSubject: BehaviorSubject<TaskTagsEnum[]> = new BehaviorSubject<TaskTagsEnum[]>(defaultTaskFilterTags);
  private startDateSubject: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  private endDateSubject: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  private showWeekendsSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    const today = new Date();
    const monday = today.getDate() - (today.getDay() - 1);
    const startDate = new Date(today.setDate(monday));
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today.setDate(monday + 6));
    endDate.setHours(23, 59, 59);
    this.startDateSubject.next(startDate);
    this.endDateSubject.next(endDate);

    this.reportMode$ = this.reportModeSubject.asObservable();
    this.tags$ = this.tagsSubject.asObservable();
    this.startDate$ = this.startDateSubject.asObservable();
    this.endDate$ = this.endDateSubject.asObservable();
    this.showWeekends$ = this.showWeekendsSubject.asObservable();
  }

  public set startDate(startDate: Date) {
    this.startDateSubject.next(startDate);
  }

  public set endDate(endDate: Date) {
    this.endDateSubject.next(endDate);
  }

  public set reportMode(mode: ReportModeEnum) {
    this.reportModeSubject.next(mode);
  }

  public set tags(tags: TaskTagsEnum[]) {
    this.tagsSubject.next(tags);
  }

  public set showWeekends(showWeekends: boolean) {
    this.showWeekendsSubject.next(showWeekends);
  }
}
