import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    MatSidenavModule,
    SidenavComponent,
    RouterOutlet,
  ],
})
export class LayoutComponent {
  private readonly loaderStateService: LoaderStateService = inject(LoaderStateService);
  private readonly taskManagerService: TaskManagerService = inject(TaskManagerService);

  protected readonly isLoading: Signal<boolean> = this.loaderStateService.isLoading;
  protected readonly activeTask: Signal<Task | null> = this.taskManagerService.activeTask;
  protected readonly timeLoggedToday: Signal<number> = this.taskManagerService.timeLoggedToday;
}
