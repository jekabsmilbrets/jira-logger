import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportConfiguratorComponent } from './report-configurator.component';

describe('ReportConfiguratorComponent', () => {
  let component: ReportConfiguratorComponent;
  let fixture: ComponentFixture<ReportConfiguratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportConfiguratorComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReportConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
