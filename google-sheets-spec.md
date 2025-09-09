# BONICA管理システム：Google Sheets連携への仕様変更

## 仕様変更の背景
freee API連携から、より安定で実装が容易なGoogle Sheets APIを使用した帳票作成に変更します。

## 新しい実装方針

### 1. freee連携機能の停止
- 既存のfreee API連携コードは保持（コメントアウト）
- freee関連のUI要素を無効化
- 環境変数は残す（将来的な復旧用）

### 2. Google Sheets API連携の実装

#### 技術要件
```typescript
// 使用技術
- googleapis: ^128.0.0
- Google Cloud Platform サービスアカウント認証
- Next.js API Routes での実装
```

#### 環境変数設定
```bash
# .env.local に追加
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID=your-project-id
```

#### 実装する機能
1. **納品書スプレッドシート作成**
   - BONICAの納品データからGoogle Sheetsに送信
   - 事前作成したテンプレートに情報を反映
   - スプレッドシートのPDF出力機能活用

2. **請求書スプレッドシート作成**
   - 月次集約された納品データから請求書作成
   - 顧客別の請求設定（billing_cycle等）を考慮
   - 複数納品の自動集計

3. **テンプレート管理**
   - 納品書用スプレッドシートテンプレート
   - 請求書用スプレッドシートテンプレート
   - テンプレートIDの管理機能

### 3. データフロー設計

#### 納品書作成フロー
```
1. 納品データ入力
2. Google Sheets API でテンプレートをコピー
3. データを該当セルに挿入
4. スプレッドシートURL生成
5. PDF出力機能の提供
6. BONICAでスプレッドシートIDを保存
```

#### 請求書作成フロー
```
1. 期間・顧客選択
2. 納品データの集約処理
3. Google Sheets API で請求書テンプレートをコピー
4. 集約データをスプレッドシートに反映
5. 請求書PDF出力
6. BONICAで請求書IDを保存
```

### 4. UI変更要件

#### 納品管理画面
- 「freee納品書発行」→「Google Sheets納品書作成」に変更
- 成功時にスプレッドシートのリンクを表示
- PDF出力ボタンの追加

#### 帳票管理画面
- 「freee請求書作成」→「Google Sheets請求書作成」に変更
- 作成された帳票の一覧表示
- スプレッドシート・PDF両方へのリンク

### 5. データベース変更

#### テーブル拡張
```sql
-- 納品テーブル
ALTER TABLE deliveries ADD COLUMN google_sheet_id VARCHAR(255);
ALTER TABLE deliveries ADD COLUMN google_sheet_url TEXT;

-- 請求書テーブル
ALTER TABLE invoices ADD COLUMN google_sheet_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN google_sheet_url TEXT;

-- テンプレート管理テーブル（新規作成）
CREATE TABLE google_sheet_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('delivery', 'invoice') NOT NULL,
  template_sheet_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 実装手順

### Phase 1: Google Cloud設定
1. Google Cloud Projectの作成
2. Google Sheets APIの有効化
3. サービスアカウントの作成
4. 秘密鍵JSONの取得

### Phase 2: APIクライアント実装
1. `lib/google-sheets-client.ts` の作成
2. サービスアカウント認証の実装
3. スプレッドシート作成・更新機能
4. エラーハンドリングの実装

### Phase 3: APIエンドポイント作成
1. `/api/google-sheets/create-delivery` 
2. `/api/google-sheets/create-invoice`
3. `/api/google-sheets/templates`

### Phase 4: UI更新
1. 既存のfreeeボタンをGoogle Sheetsボタンに変更
2. 帳票一覧画面の更新
3. テンプレート管理画面の追加

### Phase 5: テンプレート作成
1. 納品書スプレッドシートテンプレート
2. 請求書スプレッドシートテンプレート
3. テンプレートの初期データ投入

## 重要な注意事項

### セキュリティ
- サービスアカウントの秘密鍵は環境変数で管理
- スプレッドシートの共有設定は最小権限
- APIキーの漏洩防止

### API制限
- 1分間300リクエスト/プロジェクトの制限
- エクスポネンシャルバックオフの実装
- リトライ機能の追加

### テスト要件
- ダミーデータでの動作確認
- PDF出力の品質確認
- エラーケースのテスト

## 成功指標
1. 納品書・請求書の正常作成
2. スプレッドシートでの適切なレイアウト
3. PDF出力の印刷品質
4. 月30件の処理性能

## README更新について
この仕様変更の内容を以下の構成でREADME.mdに追記してください：

```markdown
## Google Sheets連携機能

### 概要
BONICA管理システムでは、Google Sheets APIを使用して納品書・請求書を作成します。

### 機能一覧
- 納品書のスプレッドシート作成
- 請求書のスプレッドシート作成  
- PDF出力機能
- テンプレート管理

### セットアップ手順
1. Google Cloud設定
2. 環境変数設定
3. テンプレート作成

### 使用方法
1. 納品管理画面での操作
2. 帳票管理画面での操作
```

段階的に実装し、各フェーズごとに動作確認を行ってください。freee連携コードは削除せず、コメントアウトで保持してください。
