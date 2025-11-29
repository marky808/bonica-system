#!/bin/bash

# 本番環境用の環境変数設定スクリプト

echo "📦 本番環境への環境変数設定を開始します..."

# 請求書テンプレートID
INVOICE_TEMPLATE_ID="1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E"
echo "$INVOICE_TEMPLATE_ID" | vercel env add GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID production

# 納品書テンプレートID
DELIVERY_TEMPLATE_ID="19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4"
echo "$DELIVERY_TEMPLATE_ID" | vercel env add GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID production

echo "✅ 環境変数の設定が完了しました"
echo ""
echo "設定した環境変数:"
echo "  - GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID: $INVOICE_TEMPLATE_ID"
echo "  - GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID: $DELIVERY_TEMPLATE_ID"
echo ""
echo "💡 次のコマンドで環境変数を確認できます:"
echo "   vercel env ls"
