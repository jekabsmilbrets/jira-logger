import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeLogListModalComponent } from './time-log-list-modal.component';

describe('TimeLogListModalComponent', () => {
  let component: TimeLogListModalComponent;
  let fixture: ComponentFixture<TimeLogListModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
                                           declarations: [TimeLogListModalComponent],
                                         })
                 .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeLogListModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
