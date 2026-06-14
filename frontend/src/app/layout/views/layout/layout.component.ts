import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  protected readonly isLoading = toSignal(this.loaderStateService.isLoading$, { initialValue: false });
  protected readonly activeTask = toSignal(this.taskManagerService.activeTask$, { initialValue: null as Task | null });
  protected readonly timeLoggedToday = toSignal(this.taskManagerService.timeLoggedToday$, { initialValue: 0 });
}
