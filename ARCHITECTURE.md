# アーキテクチャ設計

このドキュメントでは、チェスドメインモデルの設計思想とアーキテクチャについて説明します。

## 設計原則

### 1. ドメイン駆動設計（DDD）

このプロジェクトはドメイン駆動設計の原則に従っています：

- **エンティティ**: `Piece`, `Board`, `GameState` はそれぞれ独自のアイデンティティを持つエンティティ
- **値オブジェクト**: `Position`, `Move` は値オブジェクトとして実装
- **ドメインサービス**: `GameRules`, `PieceRulesFactory` はドメインロジックを提供するサービス
- **イベント**: ゲームの状態変化はイベントとして発行

### 2. 関心の分離

プロジェクトは明確に3つのレイヤーに分かれています：

```
┌─────────────────────────────────────┐
│   実装レイヤー (Implementations)    │
│  - LocalGameManager                 │
│  - HumanPlayer, RandomCpuPlayer     │
│  - ConsoleDisplay                   │
└─────────────────────────────────────┘
              ↓ depends on
┌─────────────────────────────────────┐
│   インターフェイスレイヤー          │
│  - IPlayer                          │
│  - IDisplay                         │
│  - IGameManager                     │
└─────────────────────────────────────┘
              ↓ depends on
┌─────────────────────────────────────┐
│   ドメインレイヤー (Domain)         │
│  - GameState, Board, Piece          │
│  - Move, Position                   │
│  - GameRules, PieceRules            │
│  - Events                           │
└─────────────────────────────────────┘
```

**依存関係のルール**:
- ドメインレイヤーは他のレイヤーに依存しない（純粋なビジネスロジック）
- インターフェイスレイヤーはドメインレイヤーのみに依存
- 実装レイヤーはインターフェイスとドメインの両方に依存

### 3. インターフェイス抽象化

3つの主要な抽象化を提供：

#### a) プレイヤー抽象化（IPlayer）

```typescript
interface IPlayer {
  requestMove(gameState: GameState): Promise<PlayerMove>;
  // ... イベントハンドラ
}
```

**理由**: プレイヤーの実装（人間、CPU、ネットワーク、AI）を切り替え可能にするため

**実装例**:
- `HumanPlayer`: インタラクティブディスプレイから入力を取得
- `RandomCpuPlayer`: ランダムに合法手を選択
- 将来: `MinimaxAIPlayer`, `RemotePlayer`, `NeuralNetworkPlayer`

#### b) 表示抽象化（IDisplay）

```typescript
interface IDisplay {
  showGameState(gameState: GameState): void;
  showMove(move: Move): void;
  // ...
}
```

**理由**: UI実装（CLI、Web、モバイル、VR）を切り替え可能にするため

**実装例**:
- `ConsoleDisplay`: ターミナル表示
- 将来: `WebDisplay`, `VRDisplay`, `MobileDisplay`

#### c) ゲーム管理抽象化（IGameManager）

```typescript
interface IGameManager {
  readonly events: GameEventEmitter;
  start(): Promise<void>;
  stop(): void;
  // ...
}
```

**理由**: ゲーム実行環境（ローカル、サーバー、P2P）を切り替え可能にするため

**実装例**:
- `LocalGameManager`: 単一プロセスでゲーム実行
- 将来: `ServerGameManager`, `P2PGameManager`

### 4. イミュータビリティ

ドメインオブジェクトは基本的に不変（immutable）です：

```typescript
class Piece {
  constructor(
    public readonly type: PieceType,
    public readonly color: Color,
    public readonly position: Position,
    public readonly hasMoved: boolean = false
  ) {}

  moveTo(newPosition: Position): Piece {
    return new Piece(this.type, this.color, newPosition, true);
  }
}
```

**利点**:
- 状態管理が簡単
- バグの減少
- 履歴管理が容易
- 並行処理に安全

### 5. イベント駆動アーキテクチャ

ゲームの状態変化はイベントとして発行されます：

```typescript
const eventEmitter = new GameEventEmitter();

eventEmitter.on('move_made', (event) => {
  // 移動時の処理
});

eventEmitter.on('check', (event) => {
  // チェック時の処理
});

eventEmitter.on('game_end', (event) => {
  // ゲーム終了時の処理
});
```

**利点**:
- 疎結合
- 拡張性
- デバッグ性
- イベントソーシングの実装が容易

## コアコンポーネント詳細

### GameState

ゲーム全体の状態を表現する中心的なエンティティ。

**責務**:
- 現在のボード状態の保持
- 現在のターンの管理
- 手の履歴の保持
- 移動の検証と適用
- ゲーム終了条件の判定

**設計上の決定**:
- 不変オブジェクトとして実装
- `makeMove()` は新しい `GameState` を返す
- ゲームルールの実行は `GameRules` サービスに委譲

### Board

8x8のチェスボードと駒の配置を管理。

**内部実装**:
- `Map<string, Piece>` を使用して駒を保存
- 位置キーは "file,rank" 形式

**設計上の決定**:
- 配列ではなくMapを使用する理由：
  - 空のマスを明示的に保存する必要がない
  - 駒の検索が効率的
  - メモリ効率が良い

### Move

移動を表す値オブジェクト。

**含む情報**:
- 移動元・移動先の位置
- 移動する駒
- 取った駒（あれば）
- 特殊な移動タイプ（キャスリング、アンパッサン等）
- プロモーションタイプ（あれば）

### GameRules

チェスのルールを実装する静的サービス。

**主要メソッド**:
- `isInCheck()`: チェック判定
- `isCheckmate()`: チェックメイト判定
- `isStalemate()`: ステイルメイト判定
- `getLegalMoves()`: 合法手の取得
- `isMoveLegal()`: 移動の合法性チェック

### PieceRules

各駒の移動パターンを実装。

**設計パターン**: Strategy パターン
- 各駒タイプに対応するルールクラス
- `PieceRulesFactory` でルールを取得

```typescript
const rules = PieceRulesFactory.getRules(PieceType.Knight);
const possibleMoves = rules.getPossibleMoves(piece, board);
```

## 拡張ポイント

### 1. 新しいプレイヤータイプの追加

```typescript
class MinimaxAIPlayer implements IPlayer {
  async requestMove(gameState: GameState): Promise<PlayerMove> {
    const evaluation = this.minimax(gameState, depth);
    return evaluation.bestMove;
  }

  private minimax(state: GameState, depth: number): Evaluation {
    // ミニマックスアルゴリズムの実装
  }
}
```

### 2. 新しいディスプレイタイプの追加

```typescript
class ReactDisplay implements IDisplay {
  constructor(private updateState: (state: any) => void) {}

  showGameState(gameState: GameState): void {
    this.updateState({
      board: gameState.board,
      currentTurn: gameState.currentTurn,
    });
  }

  // ... 他のメソッド
}
```

### 3. 新しいゲーム管理方式の追加

```typescript
class WebSocketGameManager implements IGameManager {
  constructor(
    private socket: WebSocket,
    private localPlayer: IPlayer
  ) {}

  async start(): Promise<void> {
    this.socket.on('opponent_move', this.handleOpponentMove);
    // ... ネットワークゲームロジック
  }

  // ... 他のメソッド
}
```

### 4. イベントリスナーの追加

```typescript
gameManager.events.on('move_made', (event) => {
  // 統計記録
  analytics.recordMove(event.move);
});

gameManager.events.on('*', (event) => {
  // ロギング
  logger.log(event);
});
```

## パフォーマンス考慮事項

### 1. 移動生成の最適化

現在の実装では単純な移動生成を行っていますが、以下の最適化が可能：

- **ビットボード**: より効率的なボード表現
- **増分更新**: ボード全体のコピーを避ける
- **移動順序付け**: アルファベータ法での枝刈り改善

### 2. メモリ使用

不変オブジェクトパターンはメモリを使用しますが：

- **利点**: 状態管理が簡単、バグが少ない
- **欠点**: メモリ使用量が増える

高頻度の解析が必要な場合は、可変版の実装を追加することも検討できます。

### 3. イベント処理

イベントリスナーが多い場合のパフォーマンス：

- イベントは同期的に処理される
- 重い処理は非同期で実行することを推奨

## テスト戦略

### 1. ユニットテスト

各ドメインコンポーネントを個別にテスト：

```typescript
describe('PawnRules', () => {
  it('should allow pawn to move forward one square', () => {
    const board = Board.createStandard();
    const pawn = board.getPiece({ file: 0, rank: 1 });
    const moves = PieceRulesFactory.getPossibleMoves(pawn, board);
    // アサーション
  });
});
```

### 2. 統合テスト

ゲーム全体のフローをテスト：

```typescript
describe('GameState', () => {
  it('should detect checkmate', () => {
    const gameState = createCheckmatePosition();
    const isCheckmate = GameRules.isCheckmate(
      gameState.board,
      Color.Black
    );
    expect(isCheckmate).toBe(true);
  });
});
```

### 3. エンドツーエンドテスト

実際のゲームプレイをシミュレート：

```typescript
describe('Full Game', () => {
  it('should play a complete game', async () => {
    const game = new LocalGameManager({
      whitePlayer: new TestPlayer(whiteMoves),
      blackPlayer: new TestPlayer(blackMoves),
    });
    await game.start();
    expect(game.gameState.result).toBe(expectedResult);
  });
});
```

## セキュリティ考慮事項

### 1. 移動検証

- 全ての移動は `GameRules.getLegalMoves()` で検証
- クライアント側の検証に依存しない（サーバー実装時）

### 2. 入力サニタイゼーション

- 代数記法の入力は厳密に検証
- 不正な位置や移動は拒否

### 3. タイムアウト保護

- 無限ループを防ぐためのターン制限
- プレイヤーの思考時間制限

## まとめ

このアーキテクチャは以下を実現します：

1. **柔軟性**: あらゆるUI、プレイヤータイプ、ゲーム管理方式に対応
2. **保守性**: 関心の分離により変更が容易
3. **テスト容易性**: 各コンポーネントを独立してテスト可能
4. **拡張性**: 新機能の追加が容易
5. **型安全性**: TypeScriptによる強力な型チェック

この設計により、シンプルなCLIゲームから、複雑なWebアプリケーション、VR体験まで、同じコアドメインモデルを使用できます。
