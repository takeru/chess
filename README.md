# Chess Domain Model (TypeScript)

[![Tests](https://github.com/takeru/chess/actions/workflows/test.yml/badge.svg)](https://github.com/takeru/chess/actions/workflows/test.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

完全なチェスゲームのドメインモデルをTypeScriptで実装。あらゆるインターフェイス（CLI、Web、VR等）、あらゆるゲーム管理方式（ローカル、クライアントサーバ、P2P等）に対応できる柔軟な設計。

## 🎮 NEW: Real-time Multiplayer Chess (Convex)

このプロジェクトには、Convexを使用したリアルタイム対戦チェス実装が含まれています！

- ✅ **チート防止**: 全ての手がサーバーサイドで検証
- ✅ **リアルタイム同期**: WebSocketなしで即座に反映
- ✅ **自動デプロイ**: Vercel + Convexで簡単デプロイ

詳細は [CONVEX_SETUP.md](./CONVEX_SETUP.md) を参照してください。

## 特徴

### ドメインモデル
- **完全なチェスルール実装**
  - 全ての駒の移動ルール（ポーン、ナイト、ビショップ、ルーク、クイーン、キング）
  - 特殊ルール（キャスリング、アンパッサン、ポーンプロモーション）
  - チェック、チェックメイト、ステイルメイトの検出
  - 引き分け条件（ステイルメイト、駒不足、50手ルール）

### 柔軟なアーキテクチャ
- **インターフェイス非依存**: CLI、Web UI、VR、モバイルなど、あらゆるインターフェイスに対応
- **プレイヤー抽象化**: 人間、CPU、リモートプレイヤー、AIなど自由に実装可能
- **ゲーム管理抽象化**: ローカル実行、クライアントサーバ、P2P、クラウドなど選択可能
- **イベント駆動**: ゲームの全ての変化をイベントとして取得可能

### 使用ケース対応
- 人間 vs 人間
- 人間 vs CPU
- CPU vs CPU
- チェスパズル
- オンライン対戦
- チェス分析ツール
- チェスAI開発

## プロジェクト構造

```
src/
├── domain/              # コアドメインモデル
│   ├── types.ts        # 基本型定義（Color, PieceType, Position等）
│   ├── piece.ts        # Pieceエンティティ
│   ├── board.ts        # Boardエンティティ
│   ├── move.ts         # Moveとその結果
│   ├── gameState.ts    # GameStateエンティティ
│   ├── events.ts       # イベントシステム
│   └── rules/          # ゲームルール
│       ├── pieceRules.ts    # 各駒の移動ルール
│       └── gameRules.ts     # ゲームルール（チェック、チェックメイト等）
├── interfaces/         # 抽象化インターフェイス
│   ├── player.ts       # IPlayer - プレイヤーインターフェイス
│   ├── display.ts      # IDisplay - 表示インターフェイス
│   └── gameManager.ts  # IGameManager - ゲーム管理インターフェイス
├── implementations/    # 具体的な実装例
│   ├── managers/
│   │   └── localGameManager.ts  # ローカルゲーム管理
│   ├── players/
│   │   ├── humanPlayer.ts       # 人間プレイヤー
│   │   └── randomCpuPlayer.ts   # ランダムCPU
│   └── displays/
│       └── consoleDisplay.ts    # コンソール表示
├── examples/           # 使用例
└── index.ts           # メインエクスポート
```

## インストール

```bash
npm install
npm run build
```

## 使用例

### 例1: 人間 vs ランダムCPU

```typescript
import {
  Color,
  LocalGameManager,
  HumanPlayer,
  RandomCpuPlayer,
  ConsoleDisplay,
} from './src';

const display = new ConsoleDisplay();

const whitePlayer = new HumanPlayer('human1', 'You', Color.White, display);
const blackPlayer = new RandomCpuPlayer('cpu1', 'CPU', Color.Black, 1000);

const gameManager = new LocalGameManager({
  whitePlayer,
  blackPlayer,
});

gameManager.events.on('*', (event) => {
  display.onGameEvent?.(event);
});

await gameManager.start();
```

### 例2: CPU vs CPU

```typescript
import {
  Color,
  LocalGameManager,
  RandomCpuPlayer,
  ConsoleDisplay,
} from './src';

const display = new ConsoleDisplay();

const whitePlayer = new RandomCpuPlayer('cpu1', 'CPU White', Color.White, 500);
const blackPlayer = new RandomCpuPlayer('cpu2', 'CPU Black', Color.Black, 500);

const gameManager = new LocalGameManager({
  whitePlayer,
  blackPlayer,
});

gameManager.events.on('*', (event) => {
  display.onGameEvent?.(event);
});

await gameManager.start();
```

### 例3: カスタム盤面（パズル）

```typescript
import {
  GameState,
  Board,
  Piece,
  Color,
  PieceType,
} from './src';

// カスタム盤面の作成
const pieces: Piece[] = [
  new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
  new Piece(PieceType.Queen, Color.White, { file: 3, rank: 0 }),
  new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
];

const customBoard = new Board(pieces);
const gameState = GameState.createCustom(customBoard, Color.White);

// 合法手の取得
const legalMoves = gameState.getLegalMoves();
console.log(`Legal moves: ${legalMoves.length}`);
```

### 例4: イベント監視

```typescript
import { GameEventEmitter } from './src';

const eventEmitter = new GameEventEmitter();

// 全てのイベントを監視
eventEmitter.on('*', (event) => {
  console.log('Event:', event.type, event);
});

// 特定のイベントを監視
eventEmitter.on('move_made', (event) => {
  console.log('Move:', event.move.toAlgebraic());
});

eventEmitter.on('check', (event) => {
  console.log(`${event.color} is in check!`);
});

eventEmitter.on('game_end', (event) => {
  console.log(`Game ended: ${event.result} (${event.reason})`);
});
```

## API概要

### コアクラス

#### `GameState`
ゲーム全体の状態を管理。

```typescript
// 標準初期配置でゲームを作成
const game = GameState.createStandard();

// 手を指す
const result = game.makeMove(
  { file: 4, rank: 1 },  // e2
  { file: 4, rank: 3 }   // e4
);

// 合法手を取得
const legalMoves = game.getLegalMoves();

// チェック判定
const inCheck = game.isInCheck();
```

#### `Board`
チェスボードと駒の配置を管理。

```typescript
// 標準配置のボードを作成
const board = Board.createStandard();

// 空のボードを作成
const emptyBoard = Board.createEmpty();

// 駒を取得
const piece = board.getPiece({ file: 0, rank: 0 });

// ボードを表示
console.log(board.toString());
```

#### `Piece`
チェスの駒を表現。

```typescript
const piece = new Piece(
  PieceType.Pawn,
  Color.White,
  { file: 4, rank: 1 }
);

// 駒を移動
const movedPiece = piece.moveTo({ file: 4, rank: 3 });

// プロモーション
const queen = pawn.promote(PieceType.Queen);

// 駒の記号を取得
const symbol = piece.getSymbol(); // '♙'
```

### インターフェイス

#### `IPlayer`
プレイヤーの実装インターフェイス。

```typescript
interface IPlayer {
  readonly id: string;
  readonly name: string;
  readonly color: Color;

  requestMove(gameState: GameState): Promise<PlayerMove>;
  onOpponentMove?(move: Move, gameState: GameState): void;
  onGameStart?(gameState: GameState): void;
  onGameEnd?(gameState: GameState): void;
  onCheck?(gameState: GameState): void;
}
```

#### `IDisplay`
表示の実装インターフェイス。

```typescript
interface IDisplay {
  showGameState(gameState: GameState): void;
  showMove(move: Move): void;
  showMessage(message: string): void;
  showError(error: string): void;
  onGameEvent?(event: ChessGameEvent): void;
}
```

#### `IGameManager`
ゲーム管理の実装インターフェイス。

```typescript
interface IGameManager {
  readonly events: GameEventEmitter;
  readonly gameState: GameState;

  start(): Promise<void>;
  stop(): void;
  pause?(): void;
  resume?(): void;
  getPlayer(color: Color): IPlayer;
}
```

## 拡張方法

### カスタムプレイヤーの実装

```typescript
import { IPlayer, PlayerMove, GameState, Color } from './src';

class MyCustomPlayer implements IPlayer {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly color: Color
  ) {}

  async requestMove(gameState: GameState): Promise<PlayerMove> {
    // カスタムロジックを実装
    const legalMoves = gameState.getLegalMoves();
    const bestMove = this.evaluatePosition(gameState, legalMoves);

    return {
      from: bestMove.from,
      to: bestMove.to,
      promotionType: bestMove.promotionType,
    };
  }

  private evaluatePosition(gameState: GameState, moves: Move[]): Move {
    // あなたのAIロジックをここに実装
    return moves[0];
  }
}
```

### カスタム表示の実装

```typescript
import { IDisplay, GameState, Move } from './src';

class WebDisplay implements IDisplay {
  showGameState(gameState: GameState): void {
    // DOMを更新してボードを表示
    this.updateBoardUI(gameState.board);
  }

  showMove(move: Move): void {
    // 移動のアニメーションを表示
    this.animateMove(move);
  }

  showMessage(message: string): void {
    // メッセージをUIに表示
    this.showNotification(message);
  }

  showError(error: string): void {
    // エラーをUIに表示
    this.showErrorDialog(error);
  }

  private updateBoardUI(board: Board): void { /* ... */ }
  private animateMove(move: Move): void { /* ... */ }
  private showNotification(msg: string): void { /* ... */ }
  private showErrorDialog(error: string): void { /* ... */ }
}
```

### カスタムゲーム管理の実装

```typescript
import { IGameManager, GameEventEmitter, GameState, IPlayer, Color } from './src';

class NetworkGameManager implements IGameManager {
  public readonly events: GameEventEmitter;
  private _gameState: GameState;

  constructor(
    private localPlayer: IPlayer,
    private networkClient: NetworkClient
  ) {
    this.events = new GameEventEmitter();
    this._gameState = GameState.createStandard();
  }

  get gameState(): GameState {
    return this._gameState;
  }

  async start(): Promise<void> {
    // ネットワーク経由でゲームを管理
    this.networkClient.on('opponent_move', (move) => {
      // 相手の手を受信して適用
      const result = this._gameState.makeMove(move.from, move.to);
      this.events.emit(/* ... */);
    });

    // ローカルプレイヤーのターンを管理
    while (this._gameState.result === GameResult.InProgress) {
      if (this._gameState.currentTurn === this.localPlayer.color) {
        const move = await this.localPlayer.requestMove(this._gameState);
        this.networkClient.sendMove(move);
      }
      await this.waitForTurn();
    }
  }

  // ... その他のメソッド
}
```

## ユースケース例

### 1. CLI チェスゲーム
提供されている `ConsoleDisplay` と `LocalGameManager` を使用。

### 2. Web チェスゲーム
- カスタム `WebDisplay` を実装（React/Vue/等）
- WebSocket経由のネットワーク対戦用カスタム `GameManager`

### 3. チェスAI開発
- カスタム `AIPlayer` を実装
- ミニマックス、アルファベータ法、ニューラルネットワーク等を実装

### 4. チェス分析ツール
- ゲーム記録を読み込んで `GameState` で再生
- 各局面の評価値を計算

### 5. VRチェス
- VR環境用の `VRDisplay` を実装
- 3Dモデルでボードと駒を表示

## 開発

```bash
# ビルド
npm run build

# 監視モード
npm run watch

# 例の実行
npm run build && node dist/examples/example1-human-vs-cpu.js
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します！

## テスト

このプロジェクトはJestを使用した包括的なテストスイートを備えています。

### テストの実行

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

### テストカバレッジ

- **Statements**: 81.09%
- **Branches**: 72.66%
- **Functions**: 79.04%
- **Lines**: 81.13%

### CI/CD

GitHub Actionsを使用して、すべてのプッシュとプルリクエストで自動的にテストが実行されます。
- Node.js 18.x と 20.x でテスト
- カバレッジレポートの自動生成
- ビルドの検証

## TODO

- [ ] FEN記法の完全サポート
- [ ] PGN（Portable Game Notation）のインポート/エクスポート
- [ ] 3回同形反復の正確な検出
- [ ] タイムコントロールの完全実装
- [x] ユニットテストの追加（110テスト、81%カバレッジ）
- [ ] より高度なAIプレイヤーの実装例
- [ ] WebブラウザでのUIサンプル
