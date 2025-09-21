# Vercelダッシュボードデプロイエラー分析

## 現在の問題状況
- CLIデプロイ: ✅ 成功
- ダッシュボードデプロイ: ❌ 失敗 ("Missing script: vercel-build")
- GitHubトリガーデプロイ: ❌ 推定失敗

## 分析結果

### 1. package.jsonの状況
- `vercel-build`スクリプトは存在: ✅
- 内容: `"npm run postinstall && rm -rf .next && next build"`
- CLIから実行可能: ✅

### 2. vercel.json設定履歴
- **以前**: `"buildCommand": "cp prisma/schema-production.prisma prisma/schema.prisma && npm run vercel-build"`
- **現在**: `"buildCommand": null`
- **意図**: Vercelデフォルトビルドを強制使用

### 3. 推定される根本原因
- Vercelプロジェクト設定レベルでのキャッシュ問題
- ダッシュボード/GitHubデプロイが古い設定を参照
- CLIデプロイは最新のvercel.jsonを使用

### 4. 設定差異の問題
- CLI: ローカルvercel.jsonを直接使用
- ダッシュボード: Vercelクラウド設定を参照
- GitHub: リモートリポジトリの設定を参照

## 実施済み対策
1. vercel.jsonでbuildCommand完全無効化
2. 明示的なNext.js設定追加
3. GitHubリポジトリへのプッシュ完了

## 次のステップ
1. Vercelプロジェクト設定の完全リセット検討
2. プロジェクト削除・再作成も選択肢
3. または時間経過によるキャッシュクリア待ち