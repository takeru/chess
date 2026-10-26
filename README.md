# Chess

[![Tests](https://github.com/takeru/chess/actions/workflows/test.yml/badge.svg)](https://github.com/takeru/chess/actions/workflows/test.yml)

Cloudflare Workers をサーバにした、**完全に API 化された**オンライン対戦チェスです。
Web ブラウザ・ターミナル（CLI）・自作アプリやボットが、どれも同じ HTTP / WebSocket API で
対局に参加し、互いに対戦できます。

- 指し手はすべてサーバ側（Durable Object）で検証 — クライアントを改造してもズルはできません
- アカウント不要。対局を作る/参加すると席ごとの秘密トークンが発行されます
- WebSocket（またはロングポーリング）でリアルタイムに更新を受信
- チェックメイト・ステイルメイト・駒不足・50 手ルール・同一局面 3 回を自動判定
- キャスリング・アンパッサン・昇格を含む完全なルール（perft で検証済み）

API の詳細は **[docs/API.md](docs/API.md)** を参照してください。

## 構成

```
packages/
├── engine/    @chess/engine    ルールエンジン（純 TypeScript、依存なし）: 合法手生成・FEN・SAN・PGN・終局判定・簡易 AI
├── protocol/  @chess/protocol  API の型定義（サーバと全クライアントで共有）
├── server/    @chess/server    Cloudflare Worker + Durable Objects（対局ごとに 1 つの GameRoom、ロビー用の Lobby）
├── client/    @chess/client    TypeScript SDK（ブラウザ / Node.js / Deno / Bun / Workers で動作）
├── cli/       @chess/cli       ターミナル版クライアント（対局・観戦・自動対局ボット）
└── web/       @chess/web       ブラウザ版クライアント（Vite、フレームワークなし）
```

```
 Web ─┐                    ┌─ Worker (ルーティング / 静的ファイル配信)
 CLI ─┼── HTTP / WebSocket ┤
 App ─┘                    ├─ GameRoom DO × 対局数  … 対局状態・検証・配信の唯一の正
                           └─ Lobby DO              … 参加者募集中の公開対局一覧
```

Web 版のビルド成果物は同じ Worker から静的アセットとして配信されるので、デプロイ先は 1 つです。

## 必要なもの

- Node.js 22 以上
- npm 11 以上（Node.js 24 に同梱。Node.js 22 なら `npm install -g npm@11`）

## ローカルで動かす

```sh
npm install
npm run dev          # Web をビルドしてから wrangler dev を起動 → http://localhost:8787
```

ブラウザで http://localhost:8787 を開き、「対局を作成」→ 表示されたリンクを別のブラウザ（またはシークレットウィンドウ）で開くと対戦できます。

UI を編集しながら確認したいときは、`npm run dev` とは別のターミナルで `npm run dev:web` を起動すると
Vite（http://localhost:5173）がホットリロードしつつ API を 8787 に転送します。

## CLI で遊ぶ

```sh
npm run cli -- new --side white --name Alice      # 対局を作成して待つ
npm run cli -- list                               # 参加者募集中の対局
npm run cli -- join <id> --name Bob               # 参加して対局
npm run cli -- bot new                            # 内蔵 AI に対局を作らせる（Web から参加して対戦できる）
npm run cli -- bot <id> --depth 3                 # 内蔵 AI を既存の対局に参加させる
npm run cli -- watch <id>                         # 観戦
```

単体の実行ファイルにする場合は `npm run build -w @chess/cli` で `packages/cli/dist/chess.js` が生成されます。
接続先は `--server https://...` または環境変数 `CHESS_SERVER` で指定します（既定は `http://localhost:8787`）。
席のトークンは `~/.config/chess-cli/seats.json` に保存され、`chess play <id>` で対局に戻れます。

対局中のコマンド: 指し手（`e4`, `Nf3`, `O-O`, `e2e4`）、`moves`（合法手一覧）、`draw`、`accept`、`decline`、`resign`、`flip`、`pgn`、`quit`。

スクリプト用のワンショットコマンド（`show`, `move`, `draw`, `resign`, `pgn`）もあり、`--json` で API のレスポンスをそのまま出力します。

## 自作クライアント

TypeScript なら SDK を使うのが簡単です。

```ts
import { ChessClient } from '@chess/client';

const client = new ChessClient({ baseUrl: 'https://chess.example.workers.dev' });
const { seat } = await client.createGame({ name: 'MyBot', side: 'white' });

client.watch(seat.gameId, async (game) => {
  if (game.status === 'active' && game.turn === seat.side) {
    await client.move(seat, game.legalMoves[0]!);
  }
});
```

他の言語でも [docs/API.md](docs/API.md) の HTTP API を叩くだけです（curl の例もあります）。

## テスト

```sh
npm test          # エンジン（perft など）とサーバ（Workers ランタイム上の統合テスト）
npm run typecheck
npm run e2e       # wrangler dev を起動し、CLI のボット同士を最後まで対局させる
```

## デプロイ（Cloudflare）

```sh
npx wrangler login
npm run deploy    # Web をビルドして Worker + Durable Objects をデプロイ
```

GitHub Actions からデプロイする場合は、リポジトリの Secrets に `CLOUDFLARE_API_TOKEN`
（Workers の編集権限）と `CLOUDFLARE_ACCOUNT_ID` を登録すると、`main` への push で
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) が自動デプロイします。
Durable Objects は SQLite バックエンドを使うため、Workers Free プランでも動作します。

## ライセンス

MIT
