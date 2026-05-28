import { Component, computed, HostListener, signal } from '@angular/core';
import { ChessService } from '../../services/chess';
import { GameViewerComponent } from '../game-viewer/game-viewer';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

// player-search component allows users to search for chess players, view their profiles, game archives 
// and manage favourites and recent games. It interacts with the ChessService to fetch data from the backend.
@Component({
  selector: 'app-player-search',
  standalone: true,
  imports: [FormsModule, GameViewerComponent, DatePipe ],
  templateUrl: './player-search.html',
  styleUrl: './player-search.css'
})
export class PlayerSearchComponent {

  // Component state managed with signals

  // Search / User Input State
  username = signal('');
  suggestions = signal<string[]>([]);
  searchHistory = signal<string[]>([]);

  // Player / Profile Data
  player = signal<any | null>(null);
  stats = signal<any | null>(null);
  archives = signal<any[]>([]);
  selectedArchive = signal<any>(null);

  // Game Data
  games = signal<any[]>([]);
  selectedGame = signal<any | null>(null);
  recentGames = signal<any[]>([]);
  annotatedGames = signal<any[]>([]);
  favouriteGames = signal<any[]>([]);

  // UI State
  activeFilter = signal<'all' | 'blitz' | 'rapid' | 'bullet'>('all');
  activeTab = signal<'games' | 'favourites' | 'recent' | 'annotated'>('games');
  replayMode = signal(false);

  // Filters / Pagination
  gameFilter = signal<'all' | 'blitz' | 'rapid' | 'bullet'>('all');
  currentPage = signal(1);
  gamesPerPage = 10;

  // Loading / Error State
  loadingGames = signal(false);
  noGames = signal(false);
  error = signal<string | null>(null);

  // Method to select a game and display it in the GameViewerComponent
  selectGame(game: any) {
  this.selectedGame.set(game);
  }

  // Constructor injects the ChessService for making API calls
  constructor(private chessService: ChessService) {} 

  // Close suggestions when clicking outside
  @HostListener('document:click', ['$event'])
    onClickOutside(event: any) {
      const clickedInside = event.target.closest('.search-container');
      if (!clickedInside) {
        this.suggestions.set([]);
      }
    }

  // Method to perform search for a player, fetch their profile, stats and game archives
  search() {
    this.error.set(null);
    this.player.set(null);
    this.stats.set(null);
    this.games.set([]);

    this.loadingGames.set(true);

    this.gameFilter.set('all');
    this.currentPage.set(1);
    this.selectedGame.set(null);
    this.replayMode.set(false);
    this.suggestions.set([]);

    const name = this.username().trim();
    if (!name) return;

    this.chessService.getPlayer(name).subscribe({
      next: data => {
        this.player.set(data);

        // Save only successful searches to database
        this.chessService.saveSearch(name).subscribe();
      },
      error: () => {
        this.error.set('Player not found');
        this.loadingGames.set(false);
      }
    });

    this.chessService.getPlayerStats(name).subscribe({
      next: data => this.stats.set(data)
    });

    // Load archives
    this.chessService.getArchives(name).subscribe({
      next: data => {
        this.archives.set(data);

        if (data.length > 0) {
          this.selectedArchive.set(data[0]);
          this.loadArchiveGames(data[0].url);
        }
      }
    });
  }

  // Load games from a specific archive, resetting relevant UI state
  loadArchiveGames(url: string) {
    this.loadingGames.set(true);

    this.gameFilter.set('all');
    this.currentPage.set(1);
    this.selectedGame.set(null);

    const username = this.player()?.username;

    this.chessService.getArchiveGames(url, username).subscribe({
      next: data => {
        this.games.set(data);
        this.loadingGames.set(false);

        if (!data || data.length === 0) {
          this.noGames.set(true);
        }
        else {
          this.noGames.set(false);
        }
      },
      error: () => {
        this.loadingGames.set(false);
        this.games.set([]); 
        this.noGames.set(true); // treat errors as no games
      }
    });
  }

  // Handle archive selection change from the dropdown, load the corresponding games
  onArchiveChange(event: any) {
    const url = event.target.value;

    const archive = this.archives().find(a => a.url === url);
    this.selectedArchive.set(archive);

    this.loadArchiveGames(url);
  }

  // Start replay mode for the selected game, also adds it to recent games in the backend
  startReplay() {
    this.replayMode.set(true);
    const game = this.selectedGame();
    this.chessService.addRecentGame(game).subscribe();
  }

  // Exit replay mode and return to game list view
  exitReplay() {
    this.replayMode.set(false);
  }

  // Update username signal and fetch suggestions based on input
  onUsernameChange(value: string) { 
    this.username.set(value);

    const query = value.toLowerCase();

    // If empty show search history
    if (query.length === 0) {
      this.suggestions.set(this.searchHistory());
      return;
    }

    // If short only show search history matches
    if (query.length < 2) {
      const historyMatches = this.searchHistory().filter(name =>
        name.toLowerCase().includes(query)
      );
      this.suggestions.set(historyMatches);
      return;
    }

    // API and search history suggestions
    this.chessService.searchPlayers(query).subscribe(apiResults => {

      const historyMatches = this.searchHistory().filter(name =>
        name.toLowerCase().includes(query)
      );

      const merged = [...new Set([...historyMatches, ...apiResults])];

      this.suggestions.set(merged.slice(0, 10));
    });
  }

  // Handle selection of a suggestion from the dropdown, update username and perform search
  selectSuggestion(username: string) {
    this.username.set(username);
    this.suggestions.set([]);
    this.search();
  }

  // Compute the list of games to display based on the selected time control filter
  filteredGames = computed(() => { 
    const filter = this.gameFilter();
    const games = this.games();

    if (filter === 'all') return games;

    return games.filter(g => g.timeClass === filter);
  });

  // Set the time control filter and reset pagination to the first page
  setFilter(filter: 'all' | 'blitz' | 'rapid' | 'bullet') {
    this.gameFilter.set(filter);
    this.currentPage.set(1);
  }

  // Get the active list of games to display based on the currently selected tab (games, favourites, recent or annotated)
  getActiveList() {
    if (this.activeTab() === 'games') {
      return this.filteredGames();
    } else {
      return this.favouriteGames();
    }
  }

  // Get the paginated list of games to display on the current page based on the active tab and filters
  pagedList() {
    if (this.activeTab() === 'recent') {
      return this.recentGames();
    }

    let list = [];

    if (this.activeTab() === 'games') {
      list = this.filteredGames();
    } else if (this.activeTab() === 'favourites') {
      list = this.favouriteGames();
    } else if (this.activeTab() === 'annotated') {
      list = this.annotatedGames();
    }

    const start = (this.currentPage() - 1) * this.gamesPerPage;
    return list.slice(start, start + this.gamesPerPage);
  }

  // Calculate the total number of pages for pagination based on the length of the active game list and games per page
  totalPages() {
    if (this.activeTab() === 'recent') {
      return 1;
    }

    return Math.max(1, Math.ceil(this.currentListLength() / this.gamesPerPage));
  }

  // Navigate to the next page of games if not on the last page
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  // Navigate to the previous page of games if not on the first page
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  // Get the length of the currently active game list based on the selected tab, used for pagination calculations
  currentListLength() {
    if (this.activeTab() === 'games') {
      return this.filteredGames().length;
    }

    if (this.activeTab() === 'favourites') {
      return this.favouriteGames().length;
    }

    if (this.activeTab() === 'recent') {
      return this.recentGames().length;
    }

    return 0;
  }

  // Set the active tab for viewing games, favourites, recent or annotated, and load the corresponding data
  setTab(tab: 'games' | 'favourites' | 'recent' | 'annotated') {
    this.activeTab.set(tab);
    this.currentPage.set(1);

    if (tab === 'favourites') this.loadFavourites();
    if (tab === 'recent') this.loadRecent();
    if (tab === 'annotated') this.loadAnnotated();
  }

  // Toggle a game as favourite or not, and refresh the favourites list after the operation
  toggleFavourite(game: any) {
    this.chessService.toggleFavourite(game).subscribe((res: any) => {
      this.loadFavourites();
    });
  }

  // Check if a game is in the favourites list, used to update the UI state of favourite buttons
  isFavourite(game: any) {
    return this.favouriteGames().some(g => g.pgn === game.pgn);
  }

  // Load initial data such as favourites, recent games, search history and annotated games when the component initializes
  async ngOnInit() {
    // Wake up the backend
    await fetch('https://6yx23nw3i8.execute-api.eu-west-1.amazonaws.com/wake', {
      method: 'POST'
    });

    // Give EC2 time to boot
    await new Promise(r => setTimeout(r, 10000));

    this.loadFavourites();
    this.loadRecent();
    this.loadSearchHistory();
    this.loadAnnotated();
  }

  // Fetch search history from the backend and update the searchHistory signal, used for suggestions and displaying past searches
  loadSearchHistory() {
    this.chessService.getSearchHistory().subscribe(data => {
      console.log("Search history from DB:", data);
      this.searchHistory.set(data.map(p => p.username));
    });
  }

  // Fetch favourite games from the backend and update the favouriteGames signal, used for displaying the user's favourite games
  loadFavourites() { 
    this.chessService.getFavouriteGames().subscribe((data: any[]) => {
      this.favouriteGames.set(data);
    });
  }

  // Fetch recent games from the backend and update the recentGames signal, used for displaying recently played or viewed games
  loadRecent() {
    this.chessService.getRecentGames().subscribe(data => {
      this.recentGames.set(data);
      this.currentPage.set(1);
    });
  }

  // Load annotated games from the backend and update the annotatedGames signal, used for displaying games with annotations in a separate tab
  loadAnnotated() {
    this.chessService.getAnnotatedGames().subscribe(data => {
      this.annotatedGames.set(data);
      this.currentPage.set(1);
    });
  }

  // Handle input in the search box, update suggestions based on the current input value and search history 
  onSearchInput() {
    const query = this.username().toLowerCase();

    // If input is empty show search history
    if (!query) {
      this.suggestions.set(this.searchHistory());
      return;
    }

    // Fetch suggestions from the backend based on the current input query
    this.chessService.searchPlayers(query).subscribe(apiResults => { 
      const historyMatches = this.searchHistory().filter(name =>
        name.toLowerCase().includes(query)
      );

      // Merge API results with search history matches, ensuring uniqueness and limiting to top 10 suggestions
      const merged = [...new Set([...historyMatches, ...apiResults])];
      this.suggestions.set(merged.slice(0, 10));
    });
  }

}