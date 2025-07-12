import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportModeSwitcherComponent } from './report-mode-switcher.component';

describe('ReportModeSwitcherComponent', () => {
  let component: ReportModeSwitcherComponent;
  let fixture: ComponentFixture<ReportModeSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportModeSwitcherComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportModeSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
