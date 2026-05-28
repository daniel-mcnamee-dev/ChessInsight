import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChessService {

  // Base URL for the backend API
  private baseUrl = 'http://52.18.58.231:3000';
  private apiBase = `${this.baseUrl}/api`;
  private dbBase = `${this.baseUrl}/db`;
  // private apiBase = 'http://localhost:3000/api';

  // Inject HttpClient for making API calls
  constructor(private http: HttpClient) {}

  // Fetch player profile information
  getPlayer(username: string): Observable<any> {
    return this.http.get(`${this.apiBase}/player/${username}`);
  }

  getPlayerStats(username: string): Observable<any> {
    return this.http.get(`${this.apiBase}/player/${username}/stats`);
  }

  // Fetch games for a player
  getPlayerGames(username: string) {
  return this.http.get<any[]>(`${this.apiBase}/player/${username}/games`);
  }

  // Search for players by username
  searchPlayers(query: string) {
    return this.http.get<string[]>(`${this.apiBase}/players/search/${query}`);
  }

  // Fetch player's game archives
  getArchives(username: string) {
    return this.http.get<any[]>(`${this.apiBase}/player/${username}/archives`);
  }

  // Fetch games from a specific archive
  getArchiveGames(url: string, username: string) {
    return this.http.get<any[]>(
      `${this.apiBase}/archive?url=${encodeURIComponent(url)}&username=${username}`
    );
  }

  // Save search history
  saveSearch(username: string) {
    return this.http.post(
      `${this.dbBase}/players/search`,
      { username }
    );
  }

  // Fetch search history
  getSearchHistory() {
    return this.http.get<any[]>(
      `${this.dbBase}/players/search`
    );
  }

  // Toggle favourite game
  toggleFavourite(game: any) {
    return this.http.post(
      `${this.dbBase}/favourites/toggle`,
      game
    );
  }

  // Fetch favourite games
  getFavouriteGames() {
    return this.http.get<any[]>(
      `${this.dbBase}/favourites`
    );
  }

  // Add a game to recent games
  addRecentGame(game: any) {
    return this.http.post(
      `${this.dbBase}/recent`,
      game
    );
  }

  // Fetch recent games
  getRecentGames() {
    return this.http.get<any[]>(
      `${this.dbBase}/recent`
    );
  }

  // Save a move note for a specific game
  saveMoveNote(note: any) {
    return this.http.post(
      `${this.dbBase}/move-notes`,
      note
    );
  }

  // Fetch move notes for a specific game
  getMoveNotes(pgn: string) {
    return this.http.get<any[]>(
      `${this.dbBase}/move-notes/${encodeURIComponent(pgn)}`
    );
  }

  // Fetch annotated games
  getAnnotatedGames() {
    return this.http.get<any[]>(
      `${this.dbBase}/move-notes`
    );
  }

}