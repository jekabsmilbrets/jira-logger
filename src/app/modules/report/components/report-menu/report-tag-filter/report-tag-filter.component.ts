import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormControl }                            from '@angular/forms';

import { defaultTaskFilterTags } from '@task/constants/default-tags.constants';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

@Component({
             selector: 'app-report-tag-filter',
             templateUrl: './report-tag-filter.component.html',
             styleUrls: ['./report-tag-filter.component.scss'],
           })
export class ReportTagFilterComponent {
  public tagList: {
    value: TaskTagsEnum;
    viewValue: string;
  }[] = [
    {
      value: TaskTagsEnum.capex,
      viewValue: 'Capex',
    },
    {
      value: TaskTagsEnum.opex,
      viewValue: 'Opex',
    },
    {
      value: TaskTagsEnum.other,
      viewValue: 'Other',
    },
  ];

  public tagFormControl: FormControl<TaskTagsEnum[] | null> = new FormControl<TaskTagsEnum[] | null>(defaultTaskFilterTags);

  @Output()
  public tagChange: EventEmitter<TaskTagsEnum[]> = new EventEmitter<TaskTagsEnum[]>();

  @Input()
  public set tags(tags: TaskTagsEnum[] | null) {
    if (tags) {
      this.tagFormControl.setValue(
        tags,
        {emitEvent: false},
      );
    }
  }

  public tagValueChange(value: TaskTagsEnum[]): void {
    this.tagChange.emit(value);
  }
}
