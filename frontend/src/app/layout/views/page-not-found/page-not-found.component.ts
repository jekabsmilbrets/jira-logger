import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'layout-page-not-found-view',
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class PageNotFoundComponent {
}
