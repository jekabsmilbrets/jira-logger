import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportMenuComponent } from './report-menu.component';

describe('ReportMenuComponent', () => {
  let component: ReportMenuComponent;
  let fixture: ComponentFixture<ReportMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportMenuComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
