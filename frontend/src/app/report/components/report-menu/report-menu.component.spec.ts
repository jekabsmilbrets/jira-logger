import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Signal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { BehaviorSubject } from 'rxjs';

import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';
import { Tag } from '@shared/models/tag.model';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { ReportMenuComponent } from './report-menu.component';

class ReportServiceStub {
  private readonly reportModeSignal = signal<ReportModeEnum>(ReportModeEnum.total);
  private readonly tagsSignal = signal<Tag[]>([]);
  private readonly dateSignal = signal<Date | null>(null);
  private readonly startDateSignal = signal<Date | null>(null);
  private readonly endDateSignal = signal<Date | null>(null);
  private readonly showWeekendsSignal = signal<boolean>(false);
  private readonly hideUnreportedTasksSignal = signal<boolean>(false);

  public get reportMode(): Signal<ReportModeEnum> {
    return this.reportModeSignal.asReadonly();
  }

  public set reportMode(value: ReportModeEnum) {
    this.reportModeSignal.set(value);
  }

  public get tags(): Signal<Tag[]> {
    return this.tagsSignal.asReadonly();
  }

  public set tags(value: Tag[]) {
    this.tagsSignal.set(value);
  }

  public get date(): Signal<Date | null> {
    return this.dateSignal.asReadonly();
  }

  public set date(value: Date | null) {
    this.dateSignal.set(value);
  }

  public get startDate(): Signal<Date | null> {
    return this.startDateSignal.asReadonly();
  }

  public set startDate(value: Date | null) {
    this.startDateSignal.set(value);
  }

  public get endDate(): Signal<Date | null> {
    return this.endDateSignal.asReadonly();
  }

  public set endDate(value: Date | null) {
    this.endDateSignal.set(value);
  }

  public get showWeekends(): Signal<boolean> {
    return this.showWeekendsSignal.asReadonly();
  }

  public set showWeekends(value: boolean) {
    this.showWeekendsSignal.set(value);
  }

  public get hideUnreportedTasks(): Signal<boolean> {
    return this.hideUnreportedTasksSignal.asReadonly();
  }

  public set hideUnreportedTasks(value: boolean) {
    this.hideUnreportedTasksSignal.set(value);
  }
}

describe('ReportMenuComponent', () => {
  let fixture: ComponentFixture<ReportMenuComponent>;
  let component: ReportMenuComponent;
  let reportService: ReportServiceStub;
  let matDialog: { open: ReturnType<typeof vi.fn> };
  const isSmallScreen$ = new BehaviorSubject<BreakpointState>({
    matches: true,
    breakpoints: { '(max-width: 1300px)': true },
  });

  beforeEach(async () => {
    matDialog = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReportMenuComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: {
            observe: vi.fn().mockReturnValue(isSmallScreen$.asObservable()),
          },
        },
        { provide: MatDialog, useValue: matDialog },
        { provide: ReportService, useClass: ReportServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportMenuComponent);
    component = fixture.componentInstance;
    (component as any).ReportModeEnum = ReportModeEnum;
    reportService = TestBed.inject(ReportService) as unknown as ReportServiceStub;

    fixture.detectChanges();
  });

  it('creates and exposes mobile breakpoint state', () => {
    const result = (component as any).isSmallerThanDesktop();

    expect(component).toBeTruthy();
    expect(result).toBe(true);
  });

  it('updates ReportService state through component handlers', () => {
    const date = new Date('2026-05-30T00:00:00.000Z');
    const startDate = new Date('2026-05-01T00:00:00.000Z');
    const endDate = new Date('2026-05-31T00:00:00.000Z');
    const tags = [{ id: 'tag-1', name: 'Backend' } as Tag];

    (component as any).onReportModeChange(ReportModeEnum.dateRange);
    (component as any).onTagChange(tags);
    (component as any).onDateChange(date);
    (component as any).onStartDateChange(startDate);
    (component as any).onEndDateChange(endDate);
    (component as any).onShowWeekendsChange(true);
    (component as any).onHideUnreportedTasksChange(true);

    expect(reportService.reportMode()).toBe(ReportModeEnum.dateRange);
    expect(reportService.tags()).toBe(tags);
    expect(reportService.date()).toBe(date);
    expect(reportService.startDate()).toBe(startDate);
    expect(reportService.endDate()).toBe(endDate);
    expect(reportService.showWeekends()).toBe(true);
    expect(reportService.hideUnreportedTasks()).toBe(true);
  });

  it('opens dialog for small screen menu', () => {
    (component as any).onSmallScreenMenuToggle();

    expect(matDialog.open).toHaveBeenCalledTimes(1);
    expect(matDialog.open).toHaveBeenCalledWith(expect.any(Object));
  });

  it('opens small-screen dialog from template button click', () => {
    isSmallScreen$.next({ matches: true, breakpoints: { '(max-width: 1300px)': true } });
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[mat-icon-button]'));
    button.nativeElement.click();

    expect(matDialog.open).toHaveBeenCalled();
    const [dialogTemplateRef] = matDialog.open.mock.calls.at(-1) as [any];
    dialogTemplateRef.createEmbeddedView({});
  });

  it('resolves small screen dialog template signal', () => {
    fixture.detectChanges();

    expect((component as any).dialogTemplate()).toBeTruthy();
  });

  it('renders small-screen button when viewport is small and menu items when desktop', () => {
    isSmallScreen$.next({ matches: true, breakpoints: { '(max-width: 1300px)': true } });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('shared-report-mode-switcher'))).toBeFalsy();

    isSmallScreen$.next({ matches: false, breakpoints: { '(max-width: 1300px)': false } });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('shared-report-mode-switcher'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('shared-report-tag-filter'))).toBeTruthy();
  });

  it('toggles date selector and weekends controls by report mode in template', () => {
    isSmallScreen$.next({ matches: false, breakpoints: { '(max-width: 1300px)': false } });
    reportService.reportMode = ReportModeEnum.total;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('shared-report-show-weekends'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('shared-report-date-selector'))).toBeFalsy();

    reportService.reportMode = ReportModeEnum.date;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('shared-report-show-weekends'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('shared-report-date-selector'))).toBeTruthy();

    reportService.reportMode = ReportModeEnum.dateRange;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('shared-report-show-weekends'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('shared-report-date-selector'))).toBeTruthy();
  });

  it('shows date picker only for date and dateRange modes', () => {
    reportService.reportMode = ReportModeEnum.total;
    let result = (component as any).showDatePicker();
    expect(result).toBe(false);

    reportService.reportMode = ReportModeEnum.date;
    result = (component as any).showDatePicker();
    expect(result).toBe(true);

    reportService.reportMode = ReportModeEnum.dateRange;
    result = (component as any).showDatePicker();
    expect(result).toBe(true);
  });

  it('wires desktop menu child outputs through template listeners', () => {
    isSmallScreen$.next({ matches: false, breakpoints: { '(max-width: 1300px)': false } });
    reportService.reportMode = ReportModeEnum.dateRange;
    fixture.detectChanges();

    const modeSpy = vi.spyOn(component as any, 'onReportModeChange');
    const tagSpy = vi.spyOn(component as any, 'onTagChange');
    const dateSpy = vi.spyOn(component as any, 'onDateChange');
    const startSpy = vi.spyOn(component as any, 'onStartDateChange');
    const endSpy = vi.spyOn(component as any, 'onEndDateChange');
    const weekendsSpy = vi.spyOn(component as any, 'onShowWeekendsChange');
    const hideSpy = vi.spyOn(component as any, 'onHideUnreportedTasksChange');
    const date = new Date('2026-05-15T00:00:00.000Z');

    const hideUnreported = fixture.debugElement.query(By.directive(ReportHideUnreportedTasksComponent)).componentInstance as any;
    const showWeekends = fixture.debugElement.query(By.directive(ReportShowWeekendsComponent)).componentInstance as any;
    const dateSelector = fixture.debugElement.query(By.directive(ReportDateSelectorComponent)).componentInstance as any;
    const tagFilter = fixture.debugElement.query(By.directive(ReportTagFilterComponent)).componentInstance as any;
    const modeSwitcher = fixture.debugElement.query(By.directive(ReportModeSwitcherComponent)).componentInstance as any;

    hideUnreported.hideUnreportedTasksChange.emit(true);
    showWeekends.showWeekendsChange.emit(true);
    dateSelector.dateChange.emit(date);
    dateSelector.startDateChange.emit(date);
    dateSelector.endDateChange.emit(date);
    tagFilter.tagChange.emit([{ id: 't-1', name: 'Backend' } as Tag]);
    modeSwitcher.reportModeChange.emit(ReportModeEnum.date);

    expect(hideSpy).toHaveBeenCalled();
    expect(weekendsSpy).toHaveBeenCalled();
    expect(dateSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(tagSpy).toHaveBeenCalled();
    expect(modeSpy).toHaveBeenCalled();
  });
});
