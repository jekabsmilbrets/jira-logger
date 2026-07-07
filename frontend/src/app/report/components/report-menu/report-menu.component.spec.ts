import { signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { ResponsiveMenuService } from '@shared/services/responsive-menu.service';

import { ReportSettingsControlsComponent } from '@report/components/report-settings-controls/report-settings-controls.component';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { ReportMenuComponent } from './report-menu.component';

describe('ReportMenuComponent', () => {
  let fixture: ComponentFixture<ReportMenuComponent>;
  let component: ReportMenuComponent;
  let reportService: ReportServiceStub;
  let matDialog: { open: ReturnType<typeof vi.fn> };
  let isSmallerThanDesktop: WritableSignal<boolean>;

  beforeEach(async () => {
    matDialog = {
      open: vi.fn(),
    };
    reportService = new ReportServiceStub();
    isSmallerThanDesktop = signal(true);

    await TestBed.configureTestingModule({
      imports: [ReportMenuComponent],
      providers: [
        {
          provide: ResponsiveMenuService,
          useValue: {
            isSmallerThanDesktop: isSmallerThanDesktop.asReadonly(),
          },
        },
        { provide: MatDialog, useValue: matDialog },
        { provide: ReportService, useValue: reportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportMenuComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('creates and exposes mobile breakpoint state', () => {
    const result = (component as any).isSmallerThanDesktop();

    expect(component).toBeTruthy();
    expect(result).toBe(true);
  });

  it('updates ReportService settings through Report Settings controls intent', () => {
    const date = new Date('2026-05-30T00:00:00.000Z');
    const applySettingsChangeSpy = vi.spyOn(reportService, 'applySettingsChange');

    (component as any).onSettingsIntent({ type: 'set-date', date });

    expect(applySettingsChangeSpy).toHaveBeenCalledTimes(1);
    expect(applySettingsChangeSpy).toHaveBeenCalledWith({
      type: 'intent',
      intent: { type: 'set-date', date },
    });
  });

  it('opens dialog for small screen menu', () => {
    (component as any).onSmallScreenMenuToggle();

    expect(matDialog.open).toHaveBeenCalledTimes(1);
    expect(matDialog.open).toHaveBeenCalledWith(expect.any(Object));
  });

  it('opens small-screen dialog from template button click', () => {
    isSmallerThanDesktop.set(true);
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
    isSmallerThanDesktop.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(ReportSettingsControlsComponent))).toBeFalsy();

    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.directive(ReportSettingsControlsComponent))).toBeTruthy();
  });

  it('passes compact menu settings to shared controls', () => {
    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    const controls = fixture.debugElement.query(By.directive(ReportSettingsControlsComponent)).componentInstance as ReportSettingsControlsComponent;
    expect(controls.hideWeekendsWhenDateMode()).toBe(true);
    expect(controls.state()).toEqual(reportService.settingsControlsState());
  });

  it('wires shared controls output through template listener', () => {
    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    const intentSpy = vi.spyOn(component as any, 'onSettingsIntent');
    const date = new Date('2026-05-15T00:00:00.000Z');
    const controls = fixture.debugElement.query(By.directive(ReportSettingsControlsComponent)).componentInstance as ReportSettingsControlsComponent;

    controls.settingsIntent.emit({ type: 'set-date', date });

    expect(intentSpy).toHaveBeenCalledWith({ type: 'set-date', date });
  });
});
