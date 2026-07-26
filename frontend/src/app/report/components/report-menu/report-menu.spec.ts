import { signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { ResponsiveMenu } from '@shared/services/responsive-menu';

import { ReportSettingsControls } from '@report/components/report-settings-controls/report-settings-controls';
import { Report } from '@report/services/report';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { ReportMenu } from './report-menu';

describe('Report Component ReportMenu', () => {
  let fixture: ComponentFixture<ReportMenu>;
  let component: ReportMenu;
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
      imports: [ReportMenu],
      providers: [
        {
          provide: ResponsiveMenu,
          useValue: {
            isSmallerThanDesktop: isSmallerThanDesktop.asReadonly(),
          },
        },
        { provide: MatDialog, useValue: matDialog },
        { provide: Report, useValue: reportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportMenu);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('creates and exposes mobile breakpoint state', () => {
    const result = (component as any).isSmallerThanDesktop();

    expect(component).toBeTruthy();
    expect(result).toBe(true);
  });

  it('updates Report settings through Report Settings controls intent', () => {
    const date = new Date('2026-05-30T00:00:00.000Z');
    const applySettingsChangeSpy = vi.spyOn(reportService, 'applySettingsChange');

    (component as any).onSettingsIntent({ type: 'set-date', date });

    expect(applySettingsChangeSpy).toHaveBeenCalledTimes(1);
    expect(applySettingsChangeSpy).toHaveBeenCalledWith({
      type: 'settings-intent',
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
    const view = dialogTemplateRef.createEmbeddedView({});
    view.detectChanges();
    expect(view.rootNodes[0].textContent).toContain('Report');
  });

  it('resolves small screen dialog template signal', () => {
    fixture.detectChanges();

    expect((component as any).dialogTemplate()).toBeTruthy();
  });

  it('renders small-screen button when viewport is small and menu items when desktop', () => {
    isSmallerThanDesktop.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(ReportSettingsControls))).toBeFalsy();

    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button[mat-icon-button]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.directive(ReportSettingsControls))).toBeTruthy();
  });

  it('passes compact menu settings to shared controls', () => {
    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    const controls = fixture.debugElement.query(By.directive(ReportSettingsControls)).componentInstance as ReportSettingsControls;
    expect(controls.hideWeekendsWhenDateMode()).toBe(true);
    expect(controls.state()).toEqual(reportService.settingsControlsState());
  });

  it('wires shared controls output through template listener', () => {
    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    const intentSpy = vi.spyOn(component as any, 'onSettingsIntent');
    const date = new Date('2026-05-15T00:00:00.000Z');
    const controls = fixture.debugElement.query(By.directive(ReportSettingsControls)).componentInstance as ReportSettingsControls;

    controls.settingsIntent.emit({ type: 'set-date', date });

    expect(intentSpy).toHaveBeenCalledWith({ type: 'set-date', date });
  });
});
