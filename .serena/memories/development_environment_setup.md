# 開発環境セットアップと設定

## 現在の開発環境（2025-11-14時点）

### MCPサーバー設定
このプロジェクトでは以下のMCPサーバーを使用:

#### 1. serena (コードベース分析)
**機能**:
- シンボル検索とコード分析
- ファイル検索とパターンマッチング
- コード編集とリファクタリング
- メモリー機能（プロジェクト情報の永続化）

**主な利用ツール**:
- `find_symbol`: シンボル（クラス、関数など）の検索
- `search_for_pattern`: 正規表現でのパターン検索
- `get_symbols_overview`: ファイルのシンボル概要取得
- `replace_symbol_body`: シンボルの本体置換
- `write_memory` / `read_memory`: プロジェクト情報の保存/読み込み

#### 2. codex (タスク実行)
**機能**:
- 複雑なタスクの自動実行
- マルチステップ操作

### プロジェクト構成

```
/workspaces/bonica-system/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── purchases/            # 仕入れAPI
│   │   ├── product-prefixes/     # プレフィックスAPI
│   │   ├── categories/           # カテゴリーAPI
│   │   ├── deliveries/           # 納品API
│   │   └── google-sheets/        # Google Sheets API
│   ├── masters/                  # マスター管理ページ
│   ├── purchases/                # 仕入れページ
│   └── deliveries/               # 納品ページ
├── components/                   # Reactコンポーネント
│   ├── masters/                  # マスター管理コンポーネント
│   ├── purchases/                # 仕入れコンポーネント
│   ├── deliveries/               # 納品コンポーネント
│   └── layout/                   # レイアウトコンポーネント
├── lib/                          # ユーティリティ
│   ├── api.ts                    # API client
│   ├── db.ts                     # Prisma client
│   └── google-sheets-client.ts   # Google Sheets client
├── prisma/                       # データベース
│   └── schema.prisma             # スキーマ定義
└── .env.local                    # 環境変数（ローカル）
```

### データベース設定

**使用DB**: PostgreSQL (Vercel Postgres)

**接続情報**: `.env.local`に以下の環境変数
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

**マイグレーション方法**:
```bash
# スキーマ同期（開発時）
npx prisma db push

# マイグレーション生成（本番前）
npx prisma migrate dev --name migration_name

# Prisma Studio起動（GUIでデータ確認）
npx prisma studio
```

### 主要な環境変数

**ローカル開発** (`.env.local`):
```
# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Google Sheets
GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID=
GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=
GOOGLE_SHEETS_CREDENTIALS=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

**本番環境** (Vercel環境変数):
- 上記に加えて本番用の設定
- Vercelダッシュボードから設定

## 開発ワークフロー

### 1. ローカル開発サーバー起動
```bash
npm run dev
```
→ http://localhost:3000 でアクセス

### 2. コード変更後の確認
1. ファイル保存（自動リロード）
2. ブラウザで動作確認
3. ブラウザコンソールでエラー確認

### 3. データベーススキーマ変更時
```bash
# スキーマ編集
vi prisma/schema.prisma

# データベースに適用
npx prisma db push

# 型定義を再生成
npx prisma generate
```

### 4. コミットとデプロイ
```bash
# 変更をステージング
git add .

# コミット
git commit -m "説明文"

# プッシュ（自動デプロイ開始）
git push
```

### 5. Vercelでのデプロイ確認
1. https://vercel.com/dashboard にアクセス
2. プロジェクト「bonica-system」を開く
3. Deploymentsタブで状況確認
4. デプロイ完了後、本番URLで動作確認

## トラブルシューティング

### ビルドエラー時
```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
rm -rf .next
```

### データベース接続エラー時
```bash
# 環境変数を確認
cat .env.local

# Prismaクライアントを再生成
npx prisma generate
```

### 型エラー時
```bash
# TypeScriptの型チェック
npx tsc --noEmit

# Prismaの型を再生成
npx prisma generate
```

## MCPサーバーの活用方法

### メモリー機能の使い方
```
# メモリー一覧表示
list_memories

# メモリー読み込み
read_memory <memory_file_name>

# メモリー書き込み
write_memory <memory_file_name> <content>

# メモリー削除
delete_memory <memory_file_name>
```

### シンボル検索の使い方
```
# クラス/関数の検索
find_symbol <name_path>

# 使用箇所の検索
find_referencing_symbols <name_path> <relative_path>

# ファイル概要の取得
get_symbols_overview <relative_path>
```

## 他の環境からのアクセス時の注意点

### 同期が必要な情報
1. **メモリーファイル**: serenaのメモリーは環境間で共有されない
   - 重要な情報は必ずメモリーに書き込む
   - 他の環境で`list_memories`で確認

2. **Gitコミット履歴**: 
   - 作業前に`git pull`で最新を取得
   - 作業後に必ずコミット&プッシュ

3. **環境変数**: 
   - ローカル: `.env.local`
   - 本番: Vercel環境変数
   - 両方を同期させる

### 推奨ワークフロー
1. `git pull` - 最新コードを取得
2. `list_memories` - メモリー確認
3. `read_memory <重要なメモリー>` - 状況把握
4. 開発作業
5. テスト確認
6. `write_memory` - 新しい情報を記録
7. `git commit && git push` - 変更をプッシュ
