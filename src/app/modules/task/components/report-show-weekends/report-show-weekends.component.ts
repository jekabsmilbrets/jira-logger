import { Component, Output, EventEmitter, Input } from '@angular/core';
import { MatSlideToggleChange }                   from '@angular/material/slide-toggle';

@Component({
             selector: 'app-report-show-weekends',
             templateUrl: './report-show-weekends.component.html',
             styleUrls: ['./report-show-weekends.component.scss'],
           })
export class ReportShowWeekendsComponent {
  @Input()
  public showWeekends!: boolean | null;

  @Output()
  public showWeekendsChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  public onShowWeekendsChange(showWeekends: MatSlideToggleChange): void {
    this.showWeekendsChange.emit(showWeekends.checked);
  }
}
