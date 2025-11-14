#!/bin/bash

# ====================================
# Vercelに安全に環境変数を同期するスクリプト
# ====================================

echo "🔐 Vercel環境変数同期ツール"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# .env.localが存在するか確認
if [ ! -f .env.local ]; then
  echo "❌ エラー: .env.local が見つかりません"
  exit 1
fi

echo "📋 以下の環境変数をVercelに追加します:"
echo ""
echo "  - GOOGLE_OAUTH_CLIENT_ID"
echo "  - GOOGLE_OAUTH_CLIENT_SECRET"
echo "  - GOOGLE_OAUTH_REFRESH_TOKEN"
echo "  - GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID"
echo "  - GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID"
echo ""
echo "⚠️  注意: DATABASE_URL と JWT_SECRET は同期しません（本番環境用の値を使用）"
echo ""
read -p "続行しますか？ (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "キャンセルしました"
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 環境変数を読み込む
source .env.local

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
  echo "❌ エラー: Vercel CLIがインストールされていません"
  echo ""
  echo "インストール方法:"
  echo "  npm i -g vercel"
  exit 1
fi

# 各変数を追加（既存の場合は上書き確認）
add_env() {
  local name=$1
  local value=$2

  if [ -z "$value" ]; then
    echo "⚠️  スキップ: $name（値が空です）"
    return
  fi

  echo "📝 追加: $name"
  echo "$value" | vercel env add "$name" production preview

  if [ $? -eq 0 ]; then
    echo "✅ 成功: $name"
  else
    echo "❌ 失敗: $name"
  fi
  echo ""
}

# Google OAuth 2.0認証情報
add_env "GOOGLE_OAUTH_CLIENT_ID" "$GOOGLE_OAUTH_CLIENT_ID"
add_env "GOOGLE_OAUTH_CLIENT_SECRET" "$GOOGLE_OAUTH_CLIENT_SECRET"
add_env "GOOGLE_OAUTH_REFRESH_TOKEN" "$GOOGLE_OAUTH_REFRESH_TOKEN"

# Google Sheetsテンプレート
add_env "GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID" "$GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID"
add_env "GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID" "$GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 同期完了！"
echo ""
echo "📝 次のステップ:"
echo "  1. Vercel Dashboardで環境変数を確認"
echo "  2. 再デプロイ: vercel --prod"
echo "  3. 本番環境で動作確認"
echo ""
