import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportHideUnreportedTasksComponent } from './report-hide-unreported-tasks.component';

describe('ReportHideUnreportedTasksComponent', () => {
  let component: ReportHideUnreportedTasksComponent;
  let fixture: ComponentFixture<ReportHideUnreportedTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportHideUnreportedTasksComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportHideUnreportedTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
