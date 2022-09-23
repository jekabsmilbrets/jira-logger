import { Component, AfterViewChecked } from '@angular/core';

import { Observable } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';


@Component(
  {
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
  },
)
export class LayoutComponent implements AfterViewChecked {
  public isLoading$!: Observable<boolean>;

  constructor(
    private loaderStateService: LoaderStateService,
  ) {
  }

  public ngAfterViewChecked(): void {
    this.isLoading$ = this.loaderStateService.isLoading$;
  }
}
