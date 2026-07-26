import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'layout-page-not-found-view',
  templateUrl: './page-not-found.html',
  styleUrls: ['./page-not-found.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class PageNotFound {
}
