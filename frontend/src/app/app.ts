import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
  imports: [
    RouterOutlet,
  ],
})
export class App {
  protected title: string = 'Jira-Logger';
}
