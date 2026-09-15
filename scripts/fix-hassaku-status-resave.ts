#!/usr/bin/env tsx
/**
 * 八朔 Purchase status修正（本番・仕入編集フォーム経由・Playwright操作）
 *
 * quantityは変更せず、フォームの「更新」ボタンを押すだけで
 * サーバー側の自動status再計算ロジック（今回のPRで追加）を発火させ、
 * remainingQuantity=0の実態に合わせてstatusをUSEDにする。
 *
 * 対象:
 *  - cmmcvhkkz000211ushsk86mes（八朔・箱）
 *  - cmlu94nh80001mhvwqzips2dy（八朔・ネット）
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const EMAIL = process.env.ADMIN_LOGIN_EMAIL!;
const PASSWORD = process.env.ADMIN_LOGIN_PASSWORD!;
const BASE_URL = process.env.PRODUCTION_URL || 'https://bonica-system.vercel.app';

if (!EMAIL || !PASSWORD) {
  console.error('❌ ADMIN_LOGIN_EMAIL / ADMIN_LOGIN_PASSWORD が .env.local に設定されていません');
  process.exit(1);
}

const SCREENSHOT_DIR = path.join(process.cwd(), 'tmp', 'hassaku-status-fix');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const TARGETS = [
  { id: 'cmmcvhkkz000211ushsk86mes', label: '八朔・箱', rowMatch: /580\s*箱/ },
  { id: 'cmlu94nh80001mhvwqzips2dy', label: '八朔・ネット', rowMatch: /35\s*ネット/ },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log('▶ ログイン中...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');

    for (const target of TARGETS) {
      console.log(`\n=== ${target.label} (${target.id}) ===`);

      await page.goto(`${BASE_URL}/purchases`, { waitUntil: 'networkidle' });
      await page.getByPlaceholder('商品名、カテゴリー、仕入れ先で検索...').fill('八朔');
      await page.waitForTimeout(1000);

      const row = page.locator('table tbody tr').filter({ hasText: target.rowMatch });
      await row.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`  対象行: ${(await row.innerText()).replace(/\n/g, ' | ')}`);

      await row.getByTitle('編集').click();

      const quantityInput = page.getByLabel('数量 *');
      await quantityInput.waitFor({ state: 'visible', timeout: 10000 });
      const currentQuantity = await quantityInput.inputValue();
      console.log(`  数量は変更しません（現在値: ${currentQuantity}）`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-01-before-resave.png`),
        fullPage: true,
      });

      // 数量は変更せず、そのまま更新ボタンを押してstatus再計算を発火させる
      await page.getByRole('button', { name: '更新' }).click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-02-after-resave.png`),
        fullPage: true,
      });

      console.log(`  ✅ ${target.label} の再保存完了`);
    }

    console.log('\n全対象の再保存操作が完了しました。');
  } catch (err) {
    console.error('❌ エラー発生:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png'), fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
