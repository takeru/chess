import type { GameView, Side } from '@chess/client';
import { parseFen, squareName } from '@chess/engine';
import { h } from './dom.js';

// Filled glyphs for both colours (styled via CSS) render more consistently than the outline set.
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;

export interface BoardOptions {
  onMove: (uci: string) => void;
}

interface RenderState {
  game: GameView;
  perspective: Side;
  /** Side the viewer may move pieces for, if any. */
  mover: Side | null;
}

/** Interactive chessboard: click a piece then a square, or drag and drop. */
export class Board {
  readonly element: HTMLElement;
  private readonly squares: HTMLElement[] = [];
  private state: RenderState | null = null;
  private selected: string | null = null;
  private drag: { from: string; ghost: HTMLElement; startX: number; startY: number; moved: boolean } | null = null;
  private promotion: HTMLElement | null = null;

  constructor(private readonly options: BoardOptions) {
    this.element = h('div', { class: 'board', role: 'grid', 'aria-label': 'Chessboard' });
    for (let i = 0; i < 64; i++) {
      const sq = h('div', { class: 'square', role: 'gridcell' });
      this.squares.push(sq);
      this.element.append(sq);
    }
    this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', this.handleMove);
    window.addEventListener('pointerup', this.handleUp);
  }

  private readonly handleMove = (e: PointerEvent) => this.onPointerMove(e);
  private readonly handleUp = (e: PointerEvent) => this.onPointerUp(e);

  destroy(): void {
    window.removeEventListener('pointermove', this.handleMove);
    window.removeEventListener('pointerup', this.handleUp);
    this.drag?.ghost.remove();
  }

  update(game: GameView, perspective: Side, mover: Side | null): void {
    const changed = this.state?.game.version !== game.version;
    this.state = { game, perspective, mover };
    if (changed) {
      this.selected = null;
      this.closePromotion();
    }
    this.render();
  }

  private canMove(): boolean {
    const s = this.state;
    return !!s && s.game.status === 'active' && s.mover === s.game.turn;
  }

  private movesFrom(square: string): string[] {
    if (!this.canMove()) return [];
    return this.state!.game.legalMoves.filter((m) => m.startsWith(square));
  }

  /** Square name shown at visual index 0..63 (top-left first). */
  private squareAt(index: number): string {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const white = this.state?.perspective !== 'black';
    const rank = white ? 7 - row : row;
    const file = white ? col : 7 - col;
    return squareName(rank * 8 + file);
  }

  private render(): void {
    const { game, perspective } = this.state!;
    const pos = parseFen(game.fen);
    const last = game.moves.at(-1)?.uci;
    const targets = new Set(this.selected ? this.movesFrom(this.selected).map((m) => m.slice(2, 4)) : []);
    const kingInCheck = game.check ? pos.board.findIndex((p) => p?.type === 'k' && p.color === game.turn[0]) : -1;
    this.element.classList.toggle('flipped', perspective === 'black');

    this.squares.forEach((el, index) => {
      const name = this.squareAt(index);
      const sq = (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
      const piece = pos.board[sq];
      const light = ((name.charCodeAt(0) - 97) + (name.charCodeAt(1) - 49)) % 2 === 1;
      el.className = `square ${light ? 'light' : 'dark'}`;
      el.dataset.square = name;
      if (last && (last.slice(0, 2) === name || last.slice(2, 4) === name)) el.classList.add('last');
      if (name === this.selected) el.classList.add('selected');
      if (targets.has(name)) el.classList.add(piece ? 'capture' : 'target');
      if (sq === kingInCheck) el.classList.add('check');

      const row = Math.floor(index / 8);
      const col = index % 8;
      el.replaceChildren();
      if (col === 0) el.append(h('span', { class: 'coord rank' }, name[1]!));
      if (row === 7) el.append(h('span', { class: 'coord file' }, name[0]!));
      if (piece) {
        const movable = this.canMove() && piece.color === game.turn[0];
        el.append(
          h('span', { class: `piece ${piece.color === 'w' ? 'white' : 'black'}${movable ? ' movable' : ''}` }, GLYPH[piece.type]! + '︎'),
        );
      }
      el.setAttribute('aria-label', piece ? `${name} ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : name);
    });
  }

  private squareFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.square');
    return el && this.element.contains(el) ? el.dataset.square ?? null : null;
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || this.promotion) return;
    const square = (e.target as HTMLElement).closest<HTMLElement>('.square')?.dataset.square;
    if (!square) return;

    if (this.selected && this.tryMove(this.selected, square)) return;

    if (this.movesFrom(square).length > 0) {
      e.preventDefault();
      this.selected = square;
      this.render();
      const pieceEl = this.squares.find((s) => s.dataset.square === square)?.querySelector<HTMLElement>('.piece');
      if (pieceEl) {
        const ghost = pieceEl.cloneNode(true) as HTMLElement;
        ghost.classList.add('ghost');
        ghost.style.fontSize = getComputedStyle(pieceEl).fontSize;
        this.drag = { from: square, ghost, startX: e.clientX, startY: e.clientY, moved: false };
      }
    } else {
      this.selected = null;
      this.render();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      document.body.append(drag.ghost);
      this.squares.find((s) => s.dataset.square === drag.from)?.classList.add('dragging');
    }
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
  }

  private onPointerUp(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    drag.ghost.remove();
    this.squares.forEach((s) => s.classList.remove('dragging'));
    if (!drag.moved) return;
    const target = this.squareFromPoint(e.clientX, e.clientY);
    if (!target || target === drag.from || !this.tryMove(drag.from, target)) {
      this.render();
    }
  }

  /** Attempts from→to; returns true if it was a legal move (possibly awaiting a promotion choice). */
  private tryMove(from: string, to: string): boolean {
    const candidates = this.movesFrom(from).filter((m) => m.slice(2, 4) === to);
    if (candidates.length === 0) return false;
    if (candidates.length === 1) {
      this.selected = null;
      this.options.onMove(candidates[0]!);
    } else {
      this.openPromotion(from, to);
    }
    return true;
  }

  private openPromotion(from: string, to: string): void {
    const color = this.state!.game.turn === 'white' ? 'white' : 'black';
    this.promotion = h(
      'div',
      { class: 'promotion', role: 'dialog', 'aria-label': 'Choose promotion piece' },
      ...PROMOTION_PIECES.map((p) =>
        h(
          'button',
          {
            class: 'promotion-choice',
            onclick: () => {
              this.closePromotion();
              this.selected = null;
              this.options.onMove(`${from}${to}${p}`);
            },
          },
          h('span', { class: `piece ${color}` }, GLYPH[p]! + '︎'),
        ),
      ),
      h('button', { class: 'promotion-cancel', onclick: () => this.closePromotion() }, '×'),
    );
    this.element.append(this.promotion);
  }

  private closePromotion(): void {
    this.promotion?.remove();
    this.promotion = null;
  }
}
