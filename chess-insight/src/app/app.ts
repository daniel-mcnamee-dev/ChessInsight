import { Component, signal } from '@angular/core';
import { PlayerSearchComponent } from './components/player-search/player-search';

@Component({
  selector: 'app-root',
  imports: [PlayerSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chess-insight');

  reload() {
    window.location.reload();
  }
}
