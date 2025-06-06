import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeLogModalComponent } from './time-log-modal.component';

describe('TimeLogModalComponent', () => {
  let component: TimeLogModalComponent;
  let fixture: ComponentFixture<TimeLogModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimeLogModalComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeLogModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
