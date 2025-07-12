import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportTagFilterComponent } from './report-tag-filter.component';

describe('ReportTagFilterComponent', () => {
  let component: ReportTagFilterComponent;
  let fixture: ComponentFixture<ReportTagFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTagFilterComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportTagFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
