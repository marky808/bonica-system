# BONICA管理システム - タスク完了時のチェックリスト

## 必須実行項目（タスク完了後）

### 1. コード品質チェック
```bash
# TypeScriptタイプチェック実行
npm run type-check

# ESLint実行
npm run lint
```

### 2. データベース整合性チェック
```bash
# Prismaクライアント生成（スキーマ変更時）
npm run db:generate

# データベーススキーマ適用（開発環境）
DATABASE_URL="file:./dev.db" npm run db:push

# データ整合性検証（必要に応じて）
DATABASE_URL="file:./dev.db" npx tsx scripts/verify-test-data.ts
```

### 3. 開発サーバー動作確認
```bash
# 開発サーバー起動確認
HOSTNAME=0.0.0.0 npm run dev
# http://localhost:3000 でアクセス確認
```

### 4. テスト実行（重要な変更時）
```bash
# 統合テスト実行
DATABASE_URL="file:./dev.db" npm run test:integration

# ワークフローテスト実行
DATABASE_URL="file:./dev.db" npm run test:workflow
```

### 5. 本番ビルドテスト（重要な変更時）
```bash
# 本番ビルド実行
npm run build
```

## Git操作（明示的に指示された場合のみ）
```bash
# 変更をステージング
git add .

# コミット作成
git commit -m "適切なコミットメッセージ"

# リモートプッシュ
git push origin main
```

## 重要な注意事項

### 🚨 必ずチェック
- **TypeScriptエラーなし**: `npm run type-check` で0エラー
- **ESLintエラーなし**: `npm run lint` で0エラー
- **開発サーバー正常起動**: エラーなく起動すること
- **主要機能動作確認**: 変更した機能が正常動作すること

### 🔐 セキュリティチェック
- **環境変数**: 秘密情報をハードコードしていないか
- **認証・認可**: 適切な権限チェックがあるか
- **入力検証**: バリデーションが適切に実装されているか
- **SQLインジェクション対策**: Prismaを正しく使用しているか

### 📝 ドキュメント更新（必要に応じて）
- README.mdの更新
- APIエンドポイントの変更時は文書化
- 新機能追加時は使用方法を明記

### 🚀 Vercel本番環境（必要時）
- 環境変数設定確認
- データベースマイグレーション実行
- 本番デプロイ後の動作確認