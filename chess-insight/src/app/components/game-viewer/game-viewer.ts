import { Component, Input, signal, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'chessboard-element';
import { Chess } from 'chess.js';
import { ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { ChessService } from '../../services/chess';
import { FormsModule } from '@angular/forms';

// game-viewer component is responsible for displaying a chess game, allowing navigation through moves and managing move notes. 
// It uses chess.js for game logic and chessboard-element for the UI.
@Component({
  selector: 'app-game-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-viewer.html',
  styleUrl: './game-viewer.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA] 
})
export class GameViewerComponent implements AfterViewInit {

  // Inputs and ViewChild/ViewChildren for accessing DOM elements and receiving game data
  @Input() game: any;
  @ViewChildren('moveRow') moveRows!: QueryList<ElementRef>;
  @ViewChild('board') board!: ElementRef;
  @Input() playerUsername!: string;
  @ViewChildren('noteCell') noteCells!: QueryList<ElementRef>;

  // Chess.js instance for managing game state
  chess = new Chess();

  // Signals for managing component state
  moves = signal<string[]>([]);
  movePairs = signal<{ white?: string; black?: string }[]>([]);
  moveIndex = signal(0);
  currentFen = signal(this.chess.fen());
  orientation = signal<'white' | 'black'>('white');
  highlightSquares = signal<string>('');

  moveNotes = signal<{ [moveNumber: number]: string }>({});
  selectedMoveNumber = signal<number | null>(null);
  noteText = signal("");

  // Constructor injects the ChessService and sets up an effect to load game data and notes when the game input changes
  constructor(private chessService: ChessService) {
    effect(() => {
      const game = this.game;
      if (!game?.pgn) return;

      this.loadGame(game.pgn);
      this.loadNotes(game.pgn);
    });
  }

  // Inject styles for move highlighting after the view initializes
  ngAfterViewInit() {
    this.injectHighlightStyles();
  }

  // Load move notes from the backend and map them to move numbers
  loadNotes(pgn: string) {
    this.chessService.getMoveNotes(pgn).subscribe((notes: any[]) => {
      const noteMap: any = {};

      notes.forEach(n => {
        noteMap[n.moveNumber] = n.note;
      });

      this.moveNotes.set(noteMap);
      this.loadNotesIntoCells();
    });
  }

  // Load a game from its PGN, set up moves, orientation and move pairs for display
  loadGame(pgn: string) {
    this.chess.reset();

    // Remove clock annotations
    const cleanedPgn = pgn.replace(/\{[^}]+\}/g, '');

    this.chess.loadPgn(cleanedPgn);

    const history = this.chess.history({ verbose: true });

    const sanMoves = history.map(m => m.san);

    this.moves.set(sanMoves);
    this.moveIndex.set(0);

    // Determine orientation
    const username = this.playerUsername?.toLowerCase();

    if (this.game?.black?.toLowerCase() === username) {
      this.orientation.set('black');
    } else {
      this.orientation.set('white');
    }

    // Build move pairs
    const pairs: { white?: string; black?: string }[] = [];

    for (let i = 0; i < sanMoves.length; i += 2) {
      pairs.push({
        white: sanMoves[i],
        black: sanMoves[i + 1]
      });
    }

    this.movePairs.set(pairs);

    // Reset to initial position
    this.chess.reset();
    this.currentFen.set(this.chess.fen());
  }

  // Load notes into the corresponding move cells in the UI
  loadNotesIntoCells() {
    setTimeout(() => {
      const cells = this.noteCells.toArray();
      const notes = this.moveNotes();

      cells.forEach((cell, index) => {
        const moveNumber = index + 1;
        if (notes[moveNumber]) {
          cell.nativeElement.innerText = notes[moveNumber];
        }
      });
    });
  }

  // Update the note for a specific move when the user edits it
  updateNote(moveNumber: number, event: any) {
    const text = event.target.innerText;

    const notes = { ...this.moveNotes() };
    notes[moveNumber] = text;
    this.moveNotes.set(notes);
  }

  // Save the note for a specific move to the backend
  saveNote(moveNumber: number) {
    const game = this.game;
    const note = this.moveNotes()[moveNumber];

    if (!game) return;

    this.chessService.saveMoveNote({
      pgn: game.pgn,
      moveNumber: moveNumber,
      note: note,
      game: game
    }).subscribe();
  }

  // Navigate to the next move in the game, updating the board and highlights
  nextMove() {
    const index = this.moveIndex();
    if (index >= this.moves().length) return;

    const move = this.chess.move(this.moves()[index]);
    this.moveIndex.set(index + 1);
    this.currentFen.set(this.chess.fen());
    this.updateHighlight(move);
    setTimeout(() => this.scrollToCurrentMove());
  }

  // Navigate to the previous move in the game, updating the board and highlights
  prevMove() {
    if (this.moveIndex() === 0) return;
    this.chess.undo();

    const newIndex = this.moveIndex() - 1;
    this.moveIndex.set(newIndex);

    this.currentFen.set(this.chess.fen());

    const history = this.chess.history({ verbose: true });
    const lastMove = history[history.length - 1];
    this.updateHighlight(lastMove);

    setTimeout(() => this.scrollToCurrentMove());
  }

  // Reset the board to the starting position, clearing highlights
  goToStart() {
    this.chess.reset();
    this.moveIndex.set(0);
    this.currentFen.set(this.chess.fen());
    this.updateHighlight(null);
  }

  // Skip to the end of the game, applying all moves and updating highlights
  goToEnd() {
    this.chess.reset();
    const moves = this.moves();

    for (let move of moves) {
      this.chess.move(move);
    }

    this.moveIndex.set(moves.length);
    this.currentFen.set(this.chess.fen());

    this.updateHighlightFromHistory();
  }

  // Select a specific move by index, updating the board, highlights and selected move state
  selectMove(index: number) {
    this.goToMove(index);

    const moveNumber = index + 1;
    this.selectedMoveNumber.set(moveNumber);

    const notes = this.moveNotes();
    this.noteText.set(notes[moveNumber] || "");
  }

  // Navigate to a specific move index, applying moves up to that point and updating the board and highlights
  goToMove(index: number) {
    this.chess.reset();
    const moves = this.moves();

    for (let i = 0; i <= index; i++) {
      this.chess.move(moves[i]);
    }

    this.moveIndex.set(index + 1);
    this.currentFen.set(this.chess.fen());

    this.updateHighlightFromHistory();

    setTimeout(() => this.scrollToCurrentMove());
  }

  // Scroll the move list to ensure the current move is visible and centered in the view
  scrollToCurrentMove() {
    const move = this.moveIndex();
    if (move === 0) return;
    const rowIndex = Math.floor((move - 1) / 2);
    const rows = this.moveRows.toArray();
    if (!rows[rowIndex]) return;

    rows[rowIndex].nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  // Toggle the orientation of the chessboard between white and black
  toggleOrientation() {
    this.orientation.update(o => o === 'white' ? 'black' : 'white');
  }

  // Update the highlight on the chessboard for the last move made, highlighting the from and to squares
  updateHighlight(move: any) {
    const boardEl = this.board?.nativeElement;
    if (!boardEl) return;

    const shadow = boardEl.shadowRoot;
    if (!shadow) return;

    // remove previous highlights
    shadow.querySelectorAll('.last-move-from, .last-move-to').forEach((el: Element) => {
      el.classList.remove('last-move-from');
      el.classList.remove('last-move-to');
    });

    if (!move) return;
    const fromSquare = shadow.querySelector(`[data-square="${move.from}"]`);
    const toSquare = shadow.querySelector(`[data-square="${move.to}"]`);

    fromSquare?.classList.add('last-move-from');
    toSquare?.classList.add('last-move-to');
  }

  // Update highlights based on the current game history, used when jumping to a specific move or the end of the game
  updateHighlightFromHistory() {
    const history = this.chess.history({ verbose: true });
    const lastMove = history[history.length - 1];
    this.updateHighlight(lastMove);
  }

  // Inject custom styles into the chessboard's shadow DOM to enable move highlighting effects
  injectHighlightStyles() {
    const boardEl = this.board?.nativeElement;
    if (!boardEl) return;

    const shadow = boardEl.shadowRoot;
    if (!shadow) return;

    if (shadow.querySelector('#highlight-style')) return;

    const style = document.createElement('style');
    style.id = 'highlight-style';

    style.textContent = `
      .last-move-from {
        box-shadow: inset 0 0 0 9999px rgba(102, 188, 49, 0.5);
      }

      .last-move-to {
        box-shadow: 
          inset 0 0 0 9999px rgba(102, 188, 49, 0.8);
      }
    `;

    shadow.appendChild(style);
  }

}