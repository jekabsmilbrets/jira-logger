import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl }                            from '@angular/forms';

import { Observable } from 'rxjs';

import { Tag }         from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';


@Component(
  {
    selector: 'shared-report-tag-filter',
    templateUrl: './report-tag-filter.component.html',
    styleUrls: ['./report-tag-filter.component.scss'],
  },
)
export class ReportTagFilterComponent {
  public tags$: Observable<Tag[]>;

  public tagFormControl: FormControl<Tag[] | null> = new FormControl<Tag[] | null>(null);

  @Output()
  public tagChange: EventEmitter<Tag[]> = new EventEmitter<Tag[]>();

  constructor(
    private tagsService: TagsService,
  ) {
    this.tags$ = this.tagsService.tags$;
  }

  @Input()
  public set disabled(disabled: boolean | null) {
    if (disabled) {
      this.tagFormControl.disable();
    } else {
      this.tagFormControl.enable();
    }
  }

  @Input()
  public set tags(tags: Tag[] | null) {
    if (tags) {
      this.tagFormControl.setValue(
        tags,
        {emitEvent: false},
      );
    }
  }

  public tagValueChange(value: Tag[]): void {
    this.tagChange.emit(value);
  }
}
