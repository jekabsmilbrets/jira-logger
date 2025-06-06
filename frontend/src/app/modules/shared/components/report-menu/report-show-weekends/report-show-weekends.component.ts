import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component(
  {
    selector: 'shared-report-show-weekends',
    templateUrl: './report-show-weekends.component.html',
    styleUrls: ['./report-show-weekends.component.scss'],
    standalone: false,
  },
)
export class ReportShowWeekendsComponent {
  @Input()
  public disabled: boolean | null = false;

  @Input()
  public showWeekends!: boolean | null;

  @Output()
  public showWeekendsChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  public onShowWeekendsChange(showWeekends: MatSlideToggleChange): void {
    this.showWeekendsChange.emit(showWeekends.checked);
  }
}
