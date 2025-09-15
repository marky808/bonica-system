# BONICA管理システム - 推奨コマンド一覧

## 開発サーバー
```bash
# 開発サーバー起動
npm run dev

# 開発サーバー起動（ホストを0.0.0.0に設定）
HOSTNAME=0.0.0.0 npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm run start
```

## データベース管理
```bash
# Prismaクライアント生成
npm run db:generate

# データベーススキーマ適用（開発環境）
npm run db:push

# マイグレーション作成・実行
npm run db:migrate

# 初期データ投入
npm run db:seed

# テストデータ生成
npm run seed:test

# Prisma Studio起動（データベースGUI）
npm run db:studio
```

## テスト・品質チェック
```bash
# ESLint実行
npm run lint

# TypeScriptタイプチェック
npm run type-check

# 統合テスト実行
npm run test:integration

# ワークフローテスト実行
npm run test:workflow

# テストレポート生成
npm run test:report
```

## Vercel本番環境
```bash
# Vercel本番ビルド
npm run vercel-build

# 依存関係インストール後処理
npm run postinstall
```

## 重要なデータベースコマンド（環境変数付き）
```bash
# SQLiteデータベース操作
DATABASE_URL="file:./dev.db" npm run db:push
DATABASE_URL="file:./dev.db" npm run db:seed
DATABASE_URL="file:./dev.db" npm run seed:test
DATABASE_URL="file:./dev.db" npm run test:integration

# 管理者ユーザー作成スクリプト
DATABASE_URL="file:./dev.db" npx tsx scripts/create-admin-user.ts

# データ検証スクリプト
DATABASE_URL="file:./dev.db" npx tsx scripts/verify-test-data.ts
```

## Git操作
```bash
# 変更コミット
git add .
git commit -m "コミットメッセージ"

# リモートプッシュ
git push origin main
```

## 基本的なLinuxコマンド
```bash
# ファイル・ディレクトリ一覧
ls -la

# ディレクトリ移動
cd /path/to/directory

# ファイル内容表示
cat filename

# テキスト検索
grep -r "検索文字列" .

# ファイル検索
find . -name "*.ts" -type f
```