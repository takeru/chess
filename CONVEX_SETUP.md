# Convex リアルタイム対戦チェスのセットアップガイド

このガイドでは、Convexを使用したリアルタイム対戦チェスゲームのセットアップ方法を説明します。

## 🎯 完成した機能

✅ **チート防止機能**
- 全ての手がサーバーサイドで検証される
- クライアント側の改ざんは不可能
- チェスルールが完全に適用される

✅ **リアルタイム同期**
- 対戦相手の手が即座に反映
- WebSocketの実装不要
- Convexが自動で同期

✅ **自動デプロイ対応**
- GitHubにpushで自動デプロイ
- Vercel + Convexの連携

## 📋 前提条件

- Node.js (v18以上)
- npm または yarn
- Convexアカウント（無料）

## 🚀 セットアップ手順

### 1. Convexアカウントの作成

1. https://convex.dev にアクセス
2. GitHubアカウントでサインアップ（無料）
3. 新しいプロジェクトを作成

### 2. Convexプロジェクトの初期化

```bash
# Convex開発サーバーを起動（初回のみプロジェクト設定が必要）
npx convex dev
```

初回実行時：
1. ブラウザが開き、Convexにログインを求められます
2. プロジェクトを選択または新規作成
3. `.env.local`ファイルが自動生成されます

生成される`.env.local`の例：
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-id
```

### 3. 開発サーバーの起動

**ターミナル1: Convex開発サーバー**
```bash
npm run convex:dev
```

**ターミナル2: Next.js開発サーバー**
```bash
npm run dev
```

### 4. ブラウザでアクセス

```
http://localhost:3000
```

## 🎮 使い方

### ゲームの開始

1. ブラウザで `http://localhost:3000` を開く
2. "Create New Game"ボタンをクリック
3. チェスボードが表示される

### 手を指す

1. 移動したい駒のマスをクリック（緑色にハイライトされる）
2. 移動先のマスをクリック
3. サーバーで検証され、合法な手の場合のみ適用される
4. 不正な手の場合、エラーメッセージが表示される

### マルチプレイヤー

現在のデモでは1つのブラウザで白と黒の両方を操作できます。

実際のマルチプレイヤーにするには：
1. 2つのブラウザタブを開く
2. 認証機能を追加（次のステップで説明）

## 🔐 チート防止の仕組み

### サーバーサイド検証

全ての手は`convex/games.ts`の`makeMove`関数で検証されます：

```typescript
// クライアントから送信された手
{ from: { file: 4, rank: 1 }, to: { file: 4, rank: 3 } }

// サーバー側で検証
1. プレイヤーが参加者か確認
2. プレイヤーのターンか確認
3. チェスルールに合法か確認 ← ここで全てのルールを適用
4. 合法な場合のみDBを更新
```

### クライアント改ざんの防止

```javascript
// ❌ これは動作しない（サーバーで拒否される）
await makeMove({
  from: { file: 0, rank: 0 },
  to: { file: 7, rank: 7 } // ルークを斜めに移動（不正）
});
// → Error: "Illegal move"
```

### 検証されるルール

- ✅ 駒の移動ルール（ポーン、ナイト、ビショップ、ルーク、クイーン、キング）
- ✅ チェック判定
- ✅ チェックメイト判定
- ✅ キャスリング条件
- ✅ アンパッサン
- ✅ ポーンプロモーション
- ✅ ターン順序
- ✅ ゲーム終了条件

## 📁 プロジェクト構造

```
chess/
├── src/domain/              # チェスドメインモデル（既存）
│   ├── gameState.ts        # ゲーム状態管理
│   ├── board.ts            # ボード管理
│   └── rules/              # チェスルール
│
├── convex/                 # Convexサーバー（新規）
│   ├── schema.ts           # DBスキーマ
│   ├── games.ts            # ゲームAPI
│   └── _game/
│       └── validation.ts   # サーバーサイド検証
│
├── app/                    # Next.js フロントエンド（新規）
│   ├── components/
│   │   ├── ChessGame.tsx   # ゲームコンポーネント
│   │   └── ChessBoard.tsx  # ボード表示
│   ├── layout.tsx
│   └── page.tsx
│
└── package.json
```

## 🌐 デプロイ（本番環境）

### Vercelへのデプロイ

1. **Vercelアカウント作成**
   - https://vercel.com でGitHubアカウントでサインアップ

2. **GitHubリポジトリと連携**
   ```bash
   git init
   git add .
   git commit -m "Add Convex real-time chess"
   git push origin main
   ```

3. **Vercelでプロジェクトをインポート**
   - Vercelダッシュボードで "New Project"
   - GitHubリポジトリを選択
   - 環境変数を設定（次のステップ）

4. **Convexの本番デプロイ**
   ```bash
   npx convex deploy
   ```

5. **環境変数の設定**

   Vercelのプロジェクト設定で以下を追加：
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

6. **自動デプロイ設定完了！**

   以降、GitHubにpushすると自動的にVercelにデプロイされます。

### デプロイ後の確認

- Vercelから提供されるURL（例：`your-project.vercel.app`）にアクセス
- ゲームが正常に動作することを確認

## 🔧 トラブルシューティング

### Convex接続エラー

```
Error: Convex URL not found
```

**解決方法:**
1. `.env.local`ファイルが存在するか確認
2. `NEXT_PUBLIC_CONVEX_URL`が設定されているか確認
3. 開発サーバーを再起動

### 手が指せない

```
Error: Illegal move
```

**これは正常です！** サーバーサイド検証が動作している証拠です。
合法な手を指してください。

### ゲームが表示されない

1. Convex開発サーバーが起動しているか確認
2. Next.js開発サーバーが起動しているか確認
3. ブラウザのコンソールでエラーを確認

## 🎓 次のステップ

### 1. 認証機能の追加

現在はプレイヤーIDがハードコードされています。
本格的なマルチプレイヤーにするには：

```bash
npm install @convex-dev/auth
```

詳細: https://docs.convex.dev/auth

### 2. マッチメイキング機能

- オンラインプレイヤーのリスト
- ゲーム招待システム
- ランダムマッチング

### 3. タイムコントロール

- 持ち時間管理
- 秒読み機能
- タイムアウト判定

### 4. チャット機能

- ゲーム内チャット
- Convexのリアルタイム機能を活用

## 📊 無料プランの制限

Convex無料プラン：
- ストレージ: 1GB
- 帯域幅: 1GB/月
- 関数呼び出し: 100万回/月

チェスゲームの場合：
- **月間約480ゲーム**（1日16ゲーム）まで無料

ユーザーが増えたらStarterプラン（従量課金）に移行可能。

## 💡 重要なポイント

### セキュリティ

✅ **DO（推奨）:**
- サーバーサイドで全てを検証
- クライアントの入力を信用しない
- 認証を適切に実装

❌ **DON'T（避けるべき）:**
- クライアント側だけで検証
- ゲームロジックをクライアントに置く
- 認証なしで本番運用

### パフォーマンス

- Convexはリアルタイム同期を自動最適化
- 手の履歴が長くなってもパフォーマンスは維持される
- 無駄なリクエストは自動的に削減される

## 🆘 サポート

問題が発生した場合：

1. **Convex Discord**: https://convex.dev/community
2. **Convex ドキュメント**: https://docs.convex.dev
3. **GitHub Issues**: このリポジトリのIssues

## 📚 参考資料

- [Convex公式ドキュメント](https://docs.convex.dev)
- [Next.js App Router](https://nextjs.org/docs/app)
- [チェスのルール（英語）](https://www.fide.com/FIDE/handbook/LawsOfChess.pdf)

---

Happy Chess Playing! ♟️
