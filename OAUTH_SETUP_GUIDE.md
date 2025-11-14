# 🔐 OAuth 2.0 認証セットアップガイド

## なぜOAuth 2.0が必要なのか？

サービスアカウントには以下の制限があります：
- **ストレージクォータ = 0 GB** （Googleの仕様）
- **新規ファイルを作成できない**
- **ファイルをコピーできない**

そのため、`bonicasystem@gmail.com` アカウントを直接使用するOAuth 2.0認証に切り替える必要があります。

---

## ステップ1: Google Cloud ConsoleでOAuth 2.0クライアントIDを作成

### 1.1 Google Cloud Consoleにアクセス

1. ブラウザで開く: https://console.cloud.google.com
2. プロジェクトを選択: **bonica-management-system**

### 1.2 OAuth同意画面を設定

1. 左メニュー → **APIとサービス** → **OAuth同意画面**
2. ユーザータイプを選択:
   - **外部** を選択（個人用Gmailアカウントの場合）
   - 「作成」をクリック

3. アプリ情報を入力:
   ```
   アプリ名: Bonica Management System
   ユーザーサポートメール: bonicasystem@gmail.com
   デベロッパーの連絡先情報: bonicasystem@gmail.com
   ```

4. スコープを追加:
   - 「スコープを追加または削除」をクリック
   - 以下のスコープを選択:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive`
   - 「更新」→「保存して次へ」

5. テストユーザーを追加:
   - 「ADD USERS」をクリック
   - `bonicasystem@gmail.com` を追加
   - 「保存して次へ」

6. 確認して「ダッシュボードに戻る」

### 1.3 OAuth 2.0 クライアントIDを作成

1. 左メニュー → **APIとサービス** → **認証情報**
2. 「認証情報を作成」→ **OAuth クライアント ID** を選択

3. アプリケーションの種類:
   - **ウェブアプリケーション** を選択

4. 名前を入力:
   ```
   名前: Bonica Web Application
   ```

5. 承認済みのリダイレクトURIを追加:
   ```
   http://localhost:3000/api/auth/google/callback
   ```

   ⚠️ **注意**: このURIは実際のWebアプリ用ではなく、リフレッシュトークン取得スクリプト用です。
   開発環境のみで使用するため、localhost のみで問題ありません。

6. 「作成」をクリック

7. **クライアントIDとクライアントシークレット**が表示されます
   - これらをコピーして安全に保存してください
   - ⚠️ クライアントシークレットは二度と表示されません！

---

## ステップ2: 環境変数を設定

`.env.local` ファイルに以下を追加:

```bash
# OAuth 2.0 認証情報
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REFRESH_TOKEN=  # ステップ3で取得します
```

💡 **ヒント**: プロジェクトルートに `.env.local.example` ファイルがあります。これをコピーして使用できます：
```bash
cp .env.local.example .env.local
```

**重要**: `.env.local` は既に`.gitignore`に含まれているため、Gitにコミットされません。

---

## ステップ3: リフレッシュトークンを取得

リフレッシュトークンを取得するためのスクリプトを実行します。

### 3.1 必要なパッケージをインストール

```bash
npm install googleapis
```

### 3.2 認証スクリプトを実行

```bash
npx tsx scripts/get-oauth-refresh-token.ts
```

このスクリプトは：
1. ブラウザでGoogleログイン画面を開きます
2. `bonicasystem@gmail.com` でログイン
3. アクセス許可を承認
4. リダイレクトされたURLからコードを取得
5. リフレッシュトークンを取得して表示

### 3.3 リフレッシュトークンを保存

スクリプトで表示されたリフレッシュトークンを `.env.local` に追加:

```bash
GOOGLE_OAUTH_REFRESH_TOKEN=1//your-refresh-token-here
```

---

## ステップ4: コードを修正

`lib/google-sheets-client.ts` を修正して、サービスアカウント認証からOAuth 2.0認証に切り替えます。

詳細は次のステップで実装します。

---

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: リダイレクトURIが一致していない

**解決策**:
1. Google Cloud Consoleの認証情報画面を開く
2. OAuth 2.0クライアントIDを編集
3. 承認済みのリダイレクトURIに正確なURLを追加
4. 保存してから再試行

### エラー: "access_denied"

**原因**: OAuth同意画面のテストユーザーに追加されていない

**解決策**:
1. OAuth同意画面の設定を開く
2. テストユーザーセクションで `bonicasystem@gmail.com` を追加

### エラー: "invalid_scope"

**原因**: スコープが正しく設定されていない

**解決策**:
1. OAuth同意画面の設定を開く
2. スコープセクションで以下を追加:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`

---

## 次のステップ

1. ✅ OAuth 2.0クライアントIDを作成（このガイド）
2. ⏭️ リフレッシュトークン取得スクリプトを作成
3. ⏭️ `google-sheets-client.ts` を修正
4. ⏭️ テストして動作確認

---

## 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=bonica-management-system)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Google Sheets API Reference](https://developers.google.com/sheets/api/reference/rest)
