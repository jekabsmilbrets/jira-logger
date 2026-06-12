import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';

import { Observable } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task } from '@shared/models/task.model';
import { TaskManagerService } from '@shared/services/task-manager.service';

import { HeaderComponent } from '@layout/components/header/header.component';
import { SidenavComponent } from '@layout/components/sidenav/sidenav.component';

@Component({
  selector: 'layout-view',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    HeaderComponent,
    MatSidenavModule,
    SidenavComponent,
    RouterOutlet,
    AsyncPipe,
  ],
})
export class LayoutComponent {
  protected isLoading$: Observable<boolean>;
  protected timeLoggedToday$: Observable<number>;
  protected activeTask$: Observable<Task | null>;

  private readonly loaderStateService: LoaderStateService = inject(LoaderStateService);
  private readonly taskManagerService: TaskManagerService = inject(TaskManagerService);

  constructor() {
    this.isLoading$ = this.loaderStateService.isLoading$;
    this.activeTask$ = this.taskManagerService.activeTask$;
    this.timeLoggedToday$ = this.taskManagerService.timeLoggedToday$;
  }
}
