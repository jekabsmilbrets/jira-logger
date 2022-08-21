import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable, take, tap, combineLatest, switchMap, catchError, throwError, skip, withLatestFrom } from 'rxjs';

import { StorageService }   from '@core/services/storage.service';
import { debounceDistinct } from '@core/utils/debounce-distinct.utility';

import { Tag }         from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';


@Injectable()
export class ReportService {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<Tag[]>;
  public startDate$: Observable<Date>;
  public endDate$: Observable<Date>;
  public showWeekends$: Observable<boolean>;
  public hideUnreportedTasks$: Observable<boolean>;

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);
  private tagsSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);
  private startDateSubject: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  private endDateSubject: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  private showWeekendsSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private hideUnreportedTasksSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private settingsKey: IDBValidKey = 'report';
  private customStoreName = 'settings';

  constructor(
    private storageService: StorageService,
    private tagsService: TagsService,
  ) {
    this.reportMode$ = this.reportModeSubject.asObservable();
    this.tags$ = this.tagsSubject.asObservable();
    this.startDate$ = this.startDateSubject.asObservable();
    this.endDate$ = this.endDateSubject.asObservable();
    this.showWeekends$ = this.showWeekendsSubject.asObservable();
    this.hideUnreportedTasks$ = this.hideUnreportedTasksSubject.asObservable();

    this.storageService.read(this.settingsKey, this.customStoreName)
        .pipe(
          take(1),
          withLatestFrom(this.tagsService.tags$),
          tap(([
                 settings,
                 tags,
               ]: [
                {
                  reportMode: ReportModeEnum;
                  tags: string[];
                  startDate: Date;
                  endDate: Date;
                  showWeekends: boolean;
                  hideUnreportedTasks: boolean;
                },
                Tag[],
              ]) => {
                this.reportModeSubject.next(settings?.reportMode ?? ReportModeEnum.total);
                this.tagsSubject.next(tags.filter((t: Tag) => settings?.tags.includes(t.id)) ?? []);
                this.startDateSubject.next(settings?.startDate ?? new Date());
                this.endDateSubject.next(settings?.endDate ?? new Date());
                this.showWeekendsSubject.next(settings?.showWeekends ?? false);
                this.hideUnreportedTasksSubject.next(settings?.hideUnreportedTasks ?? false);
              },
          ),
        )
        .subscribe();


    this.listenToChanges().subscribe();
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

  public set tags(tags: Tag[]) {
    this.tagsSubject.next(tags);
  }

  public set showWeekends(showWeekends: boolean) {
    this.showWeekendsSubject.next(showWeekends);
  }

  public set hideUnreportedTasks(hideUnreportedTasks: boolean) {
    this.hideUnreportedTasksSubject.next(hideUnreportedTasks);
  }

  private listenToChanges() {
    return combineLatest(
      [
        this.reportMode$.pipe(skip(1)),
        this.tags$.pipe(skip(1)),
        this.startDate$.pipe(skip(1)),
        this.endDate$.pipe(skip(1)),
        this.showWeekends$.pipe(skip(1)),
        this.hideUnreportedTasks$.pipe(skip(1)),
      ],
    )
      .pipe(
        debounceDistinct(1000),
        switchMap(
          ([
             reportMode,
             tags,
             startDate,
             endDate,
             showWeekends,
             hideUnreportedTasks,
           ]: [ReportModeEnum, Tag[], Date, Date, boolean, boolean]) =>
            this.storageService.create(
                  this.settingsKey,
                  {
                    reportMode,
                    tags: tags.map((t: Tag) => t.id),
                    startDate,
                    endDate,
                    showWeekends,
                    hideUnreportedTasks,
                  },
                  this.customStoreName,
                )
                .pipe(
                  take(1),
                  catchError(
                    (error) => {
                      console.error(error);
                      return throwError(() => new Error(error));
                    },
                  ),
                ),
        ),
      );
  }
}
