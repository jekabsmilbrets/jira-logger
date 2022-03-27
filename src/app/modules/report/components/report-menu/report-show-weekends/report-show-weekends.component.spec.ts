import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportShowWeekendsComponent } from './report-show-weekends.component';

describe('ReportShowWeekendsComponent', () => {
  let component: ReportShowWeekendsComponent;
  let fixture: ComponentFixture<ReportShowWeekendsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
                                           declarations: [ReportShowWeekendsComponent],
                                         })
                 .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportShowWeekendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
