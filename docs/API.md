# Chess API リファレンス

すべてのクライアント（Web・CLI・モバイルアプリ・ボット）はこの API だけで対局に参加します。
Web 版や CLI 版が使っている特別な裏口はありません。

- ベース URL: デプロイ先のオリジン（ローカルでは `http://localhost:8787`）
- リクエスト / レスポンスは JSON（`Content-Type: application/json`）
- CORS は全オリジン許可（Cookie は使わず、トークンを `Authorization` ヘッダで送るため）
- 型定義: [`packages/protocol/src/index.ts`](../packages/protocol/src/index.ts)
- TypeScript SDK: [`packages/client`](../packages/client/src/index.ts)

## 認証（席トークン）

アカウントはありません。対局を **作成** または **参加** すると、その対局の席（白か黒）と
秘密の `token` が返ります。指す・投了・引き分けの操作にはこのトークンが必要です。

```
Authorization: Bearer <token>
```

トークンは席ごとに発行され、サーバには SHA-256 ハッシュだけが保存されます。
なくすとその席では指せなくなるので、クライアント側で保存してください。
対局の閲覧（状態取得・WebSocket・PGN）は誰でもできます。

## エンドポイント

| メソッド | パス | 説明 | 認証 |
| --- | --- | --- | --- |
| GET | `/api/games` | 参加者を募集中の公開対局一覧 | - |
| POST | `/api/games` | 対局を作成して席を得る | - |
| GET | `/api/games/:id` | 対局の状態（ロングポーリング可） | - |
| POST | `/api/games/:id/join` | 空いている席に着く | - |
| POST | `/api/games/:id/move` | 指す | 必要 |
| POST | `/api/games/:id/resign` | 投了（相手が来る前なら中止） | 必要 |
| POST | `/api/games/:id/draw` | 引き分けの提案・承諾・拒否 | 必要 |
| GET | `/api/games/:id/pgn` | 棋譜（PGN テキスト） | - |
| GET | `/api/games/:id/ws` | WebSocket で状態をリアルタイム受信 | - |
| GET | `/api/health` | ヘルスチェック | - |

### POST /api/games — 対局を作成

```json
{ "name": "Alice", "side": "white", "visibility": "public", "fen": "<任意の開始局面>" }
```

すべて省略可能です。`side` は `white` / `black` / `random`（既定）、`visibility` は
`public`（ロビーに表示、既定）/ `private`（ID を知っている人だけ参加可）。

レスポンス `201`:

```json
{
  "game": { "...": "GameView（下記）" },
  "seat": { "gameId": "k3x9m2pa", "side": "white", "token": "q1w2e3..." }
}
```

### POST /api/games/:id/join — 参加

`{ "name": "Bob" }`（省略可）。空いている側の席が割り当てられ、対局が `active` になります。
レスポンスは作成と同じ `{ game, seat }`。席が埋まっていれば `409 game_full`。

### POST /api/games/:id/move — 指す

```json
{ "move": "e4" }
```

`move` は SAN（`e4`, `Nf3`, `exd5`, `O-O`, `e8=Q`）でも UCI（`e2e4`, `e7e8q`）でも構いません。
合法手はすべてサーバで検証されます。レスポンスは `{ game }`。

### POST /api/games/:id/draw — 引き分け

`{ "action": "offer" | "accept" | "decline" }`

- `offer`: 提案する（相手がすでに提案していれば成立）
- `accept`: 相手の提案を受ける
- `decline`: 相手の提案を断る、または自分の提案を取り下げる

提案されている側が指し手を指すと、提案は自動的に断ったことになります。

### POST /api/games/:id/resign — 投了

`active` なら投了（相手の勝ち）。相手が来る前（`waiting`）なら対局を中止します（`reason: "aborted"`）。

## GameView

```jsonc
{
  "id": "k3x9m2pa",
  "status": "active",            // waiting | active | finished
  "version": 7,                  // 変更のたびに +1
  "visibility": "public",
  "createdAt": "2026-10-26T12:00:00.000Z",
  "updatedAt": "2026-10-26T12:03:10.000Z",
  "initialFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
  "turn": "white",
  "check": false,
  "moves": [
    { "uci": "e2e4", "san": "e4", "side": "white", "fen": "...", "at": "..." }
  ],
  "legalMoves": ["a2a3", "a2a4", "..."],   // 手番側の合法手（UCI）。active のときだけ
  "players": {
    "white": { "name": "Alice", "joinedAt": "..." },
    "black": { "name": "Bob", "joinedAt": "..." }
  },
  "drawOffer": null,             // 提案中の側（white | black）
  "result": null,                // 1-0 | 0-1 | 1/2-1/2
  "reason": null                 // checkmate | stalemate | insufficient_material | fifty_move_rule
                                 // | threefold_repetition | resignation | draw_agreement | aborted
}
```

チェックメイト・ステイルメイト・駒不足・50 手ルール・同一局面 3 回はサーバが自動で判定し、対局を終了します。

## リアルタイム更新

用途に合わせて 2 通りあります。

**WebSocket** — `GET /api/games/:id/ws` に接続すると、接続直後と変更のたびに次のメッセージが届きます。

```json
{ "type": "state", "game": { "...": "GameView" } }
```

接続維持のために `ping` を送ると `pong` が返ります。操作（指し手など）は HTTP で行います。
メッセージは `version` で順序付けできるので、古いものは無視してください。

**ロングポーリング** — `GET /api/games/:id?wait=<version>&timeout=<秒>` は、
対局の `version` が指定値より大きくなるまで（最大 60 秒）レスポンスを保留します。
WebSocket が使いにくい環境（シェルスクリプトなど）向けです。

## エラー

```json
{ "error": { "code": "illegal_move", "message": "Illegal move: e2e5" } }
```

| HTTP | code | 意味 |
| --- | --- | --- |
| 400 | `bad_request` | リクエストの形式が不正 |
| 401 | `unauthorized` | `Authorization` ヘッダがない |
| 403 | `forbidden` | トークンがこの対局の席のものではない |
| 404 | `not_found` | 対局・エンドポイントが存在しない |
| 409 | `not_your_turn` | 相手の手番 |
| 409 | `game_full` | 席が埋まっている |
| 409 | `game_not_active` | 相手待ち、または終局済み |
| 422 | `illegal_move` | 非合法手 |
| 500 | `internal` | サーバ内部エラー |

## curl での対局例

```sh
API=http://localhost:8787

# 白で作成
curl -s -X POST $API/api/games -H 'Content-Type: application/json' -d '{"name":"Alice","side":"white"}'
# => {"game":{"id":"k3x9m2pa",...},"seat":{"side":"white","token":"WHITE_TOKEN",...}}

# 別のクライアントから参加（黒）
curl -s -X POST $API/api/games/k3x9m2pa/join -H 'Content-Type: application/json' -d '{"name":"Bob"}'

# 指す
curl -s -X POST $API/api/games/k3x9m2pa/move \
  -H 'Authorization: Bearer WHITE_TOKEN' -H 'Content-Type: application/json' -d '{"move":"e4"}'

# 相手の手を待つ（version 3 より新しくなるまで待機）
curl -s "$API/api/games/k3x9m2pa?wait=3&timeout=30"
```
