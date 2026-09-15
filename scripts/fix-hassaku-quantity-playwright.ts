#!/usr/bin/env tsx
/**
 * 八朔 Purchase 数量修正（本番・仕入編集フォーム経由・Playwright操作）
 *
 * 対象:
 *  - cmmcvhkkz000211ushsk86mes（八朔・箱）: quantity 1000 -> 580
 *  - cmlu94nh80001mhvwqzips2dy（八朔・ネット）: quantity 78 -> 35
 *
 * 単価は変更しない。総額はフォームの自動計算に任せる。
 * DB直接操作は一切行わない（UI経由のみ）。
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

const SCREENSHOT_DIR = path.join(process.cwd(), 'tmp', 'hassaku-fix');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const TARGETS = [
  {
    id: 'cmmcvhkkz000211ushsk86mes',
    label: '八朔・箱',
    rowMatch: /1000\s*箱/,
    newQuantity: '580',
  },
  {
    id: 'cmlu94nh80001mhvwqzips2dy',
    label: '八朔・ネット',
    rowMatch: /78\s*ネット/,
    newQuantity: '35',
  },
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

      // 検索で「八朔」に絞り込み
      await page.getByPlaceholder('商品名、カテゴリー、仕入れ先で検索...').fill('八朔');
      await page.waitForTimeout(1000); // debounced search

      const row = page.locator('table tbody tr').filter({ hasText: target.rowMatch });
      await row.waitFor({ state: 'visible', timeout: 10000 });

      const rowText = await row.innerText();
      console.log(`  対象行: ${rowText.replace(/\n/g, ' | ')}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-01-before-list.png`),
        fullPage: true,
      });

      await row.getByTitle('編集').click();

      const quantityInput = page.getByLabel('数量 *');
      await quantityInput.waitFor({ state: 'visible', timeout: 10000 });

      const beforeQuantity = await quantityInput.inputValue();
      const priceInput = page.getByLabel('総額（自動計算）');
      const beforePrice = await priceInput.inputValue();
      console.log(`  編集前フォーム値: 数量=${beforeQuantity}, 総額=${beforePrice}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-02-before-edit.png`),
        fullPage: true,
      });

      await quantityInput.click({ clickCount: 3 });
      await quantityInput.fill(target.newQuantity);
      await quantityInput.blur();
      await page.waitForTimeout(300); // 総額自動計算を待つ

      const afterPrice = await priceInput.inputValue();
      console.log(`  数量変更後の自動計算総額: ${afterPrice}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-03-after-fill.png`),
        fullPage: true,
      });

      await page.getByRole('button', { name: '更新' }).click();

      // 確認ダイアログ（forceUpdate）が出る可能性があるため軽く待つ
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${target.id}-04-after-submit.png`),
        fullPage: true,
      });

      console.log(`  ✅ ${target.label} の更新操作完了`);
    }

    console.log('\n全対象の更新操作が完了しました。');
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
