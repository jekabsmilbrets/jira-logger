import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportDateSelectorComponent } from './report-date-selector.component';

describe('ReportDateSelectorComponent', () => {
  let component: ReportDateSelectorComponent;
  let fixture: ComponentFixture<ReportDateSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportDateSelectorComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportDateSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
