# BONICA システム フォルダ整理 指示書

## 概要

bonica-system のルートディレクトリが散らかっているため、整理を行う。
**作業前に必ず git commit して現状を保存すること。**

---

## 作業前の準備

```bash
git add -A
git commit -m "整理前のバックアップ"
```

---

## 1. docs/ フォルダに移動するファイル

以下のファイルを `docs/` フォルダに移動する。
docs/ フォルダがなければ作成する。

```bash
# docs/ フォルダ作成（なければ）
mkdir -p docs

# ドキュメント系を移動
mv GOOGLE_SHEETS_PERMISSION_FIX.md docs/
mv GOOGLE_SHEETS_SETUP_GUIDE.md docs/
mv OAUTH_SETUP_GUIDE.md docs/
mv TEMPLATE_SETUP_GUIDE.md docs/
mv IMPLEMENTATION_LOG.md docs/
mv REAL_SOLUTION.md docs/
mv SHEETS_INTEGRATION_FIX_SUMMARY.md docs/
mv DEPLOYMENT.md docs/
mv google-sheets-spec.md docs/
```

---

## 2. 削除するファイル

以下は作業メモ・一時ファイルのため削除する。
**削除前に内容を確認し、必要な情報があればdocs/に残すこと。**

```bash
# 作業メモ系（内容確認後に削除）
rm "#ボニカシステムのコード整理・リファクタリング"
rm "#ボニカシステム整理作業"

# 一時ファイル
rm task
rm dev
rm force-cache-clear
rm "vercer error log"
```

---

## 3. ルートに残すべきファイル（触らない）

以下のファイルはルートに残す：

### 設定ファイル（必須）
- `.env` / `.env.local` / `.env.development` / `.env.example`
- `.gitignore`
- `next.config.mjs`
- `package.json` / `package-lock.json` / `pnpm-lock.yaml`
- `tsconfig.json` / `tsconfig.tsbuildinfo`
- `postcss.config.mjs`
- `middleware.ts`
- `next-env.d.ts`
- `vercel.json`
- `components.json`

### ドキュメント（ルート用）
- `CLAUDE.md`（Claude Code用設定）
- `README.md`（プロジェクト説明）

### フォルダ
- `app/`
- `components/`
- `docs/`
- `hooks/`
- `lib/`
- `node_modules/`
- `prisma/`
- `public/`
- `scripts/`
- `styles/`
- `test-reports/`
- `types/`

---

## 4. 整理後のルート構造（理想形）

```
bonica-system/
├── app/
├── components/
├── docs/
│   ├── DEPLOYMENT.md
│   ├── GOOGLE_SHEETS_PERMISSION_FIX.md
│   ├── GOOGLE_SHEETS_SETUP_GUIDE.md
│   ├── IMPLEMENTATION_LOG.md
│   ├── OAUTH_SETUP_GUIDE.md
│   ├── REAL_SOLUTION.md
│   ├── SHEETS_INTEGRATION_FIX_SUMMARY.md
│   ├── TEMPLATE_SETUP_GUIDE.md
│   └── google-sheets-spec.md
├── hooks/
├── lib/
├── node_modules/
├── prisma/
├── public/
├── scripts/
├── styles/
├── test-reports/
├── types/
├── .env
├── .env.development
├── .env.example
├── .env.local
├── .gitignore
├── CLAUDE.md
├── README.md
├── components.json
├── middleware.ts
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vercel.json
```

---

## 5. 作業後の確認

```bash
# 変更をコミット
git add -A
git commit -m "ルートディレクトリを整理: ドキュメントをdocs/に移動、一時ファイルを削除"

# アプリが動作するか確認
npm run dev
```

---

## 6. PROGRESS.md の作成

整理完了後、以下のファイルをルートに作成する：

```bash
touch PROGRESS.md
```

内容は別途提供するテンプレートを使用。

---

## 注意事項

- 削除するファイルは、削除前に必ず内容を確認する
- 重要な情報が含まれている場合は docs/ に移動する
- 不明なファイルがあれば確認してから対応する
