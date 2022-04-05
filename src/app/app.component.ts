import { Component } from '@angular/core';

@Component({
             selector: 'app-root',
             templateUrl: './app.component.html',
             styleUrls: ['./app.component.scss'],
           })
export class AppComponent {
  title = 'jira-logger';

  constructor(
    private window: Window,
  ) {
    this.window.navigator.storage.persist()
        .then(
          (persistent: boolean) => console.log('IndexedDB will be persistent ' + persistent),
        );
  }
}
