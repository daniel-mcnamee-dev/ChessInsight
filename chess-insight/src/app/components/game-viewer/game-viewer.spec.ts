import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameViewer } from './game-viewer';

describe('GameViewer', () => {
  let component: GameViewer;
  let fixture: ComponentFixture<GameViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(GameViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
