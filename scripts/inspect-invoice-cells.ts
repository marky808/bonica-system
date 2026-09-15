#!/usr/bin/env tsx
/**
 * 既存の4月分請求書のセル内容を読み取って比較
 *
 * 目的:
 *   ファーストプロスパー等の既存請求書がC7/D7にどう書かれているか確認し、
 *   一〇八の新生成と差異を特定する
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function main() {
  // ファーストプロスパー含む4月請求書の上位を取得
  const rawInvoices = await prisma.invoice.findMany({
    where: { year: 2026, month: 4 },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const customerMap = new Map<string, string>();
  for (const inv of rawInvoices) {
    if (!customerMap.has(inv.customerId)) {
      const c = await prisma.customer.findUnique({
        where: { id: inv.customerId },
        select: { companyName: true },
      });
      customerMap.set(inv.customerId, c?.companyName || '(不明)');
    }
  }
  const invoices = rawInvoices.map((inv) => ({
    ...inv,
    customer: { companyName: customerMap.get(inv.customerId) || '(不明)' },
  }));

  if (invoices.length === 0) {
    console.log('❌ 2026年4月分の請求書が見つかりません');
    return;
  }

  console.log(`📄 4月分請求書 ${invoices.length}件のセル内容を確認\n`);

  // OAuth2認証セットアップ
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  for (const inv of invoices) {
    console.log('─'.repeat(60));
    console.log(`🏢 ${inv.customer.companyName}`);
    console.log(`   ${inv.invoice_number} | 月別Sheet: ${inv.googleSheetId}`);
    console.log(`   タブ名: ${inv.sheetTabName || '(なし)'}`);

    if (!inv.googleSheetId) {
      console.log('   ⚠️ googleSheetId なし');
      continue;
    }

    try {
      // 全シートのIDとタイトルを取得し、tabNameに一致するsheetIdを探す
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: inv.googleSheetId,
        fields: 'sheets(properties(sheetId,title))',
      });
      const sheetsList = meta.data.sheets || [];
      const matched = sheetsList.find(
        (s) => s.properties?.title === inv.sheetTabName,
      );
      if (!matched) {
        console.log(`   ⚠️ タブ "${inv.sheetTabName}" が見つかりません。利用可能タブ:`);
        sheetsList.forEach((s) =>
          console.log(`      - "${s.properties?.title}" (id=${s.properties?.sheetId})`),
        );
        continue;
      }
      const sheetId = matched.properties!.sheetId!;

      // sheetIdで A6:E9 のグリッドデータと書式を取得
      const fmtResponse = await sheets.spreadsheets.get({
        spreadsheetId: inv.googleSheetId,
        ranges: [`${inv.sheetTabName}!A6:E9`],
        includeGridData: true,
      });
      const targetSheet = fmtResponse.data.sheets?.find(
        (s) => s.properties?.sheetId === sheetId,
      );
      const rowData = targetSheet?.data?.[0]?.rowData || [];
      console.log(`   📊 A6:E9 の内容:`);
      rowData.forEach((row, i) => {
        const rowNum = 6 + i;
        const cells = (row.values || [])
          .map((cell, c) => {
            const col = String.fromCharCode(65 + c);
            const txt = cell.formattedValue ?? '';
            return `${col}${rowNum}="${txt}"`;
          })
          .join(' ');
        console.log(`      行${rowNum}: ${cells || '(空)'}`);
      });

      // C7とD7の書式詳細
      const row7 = rowData[1]; // A7-E7（A6が0番目なのでA7は1番目）
      if (row7?.values) {
        [2, 3].forEach((idx) => {
          const cell = row7.values![idx];
          if (!cell) return;
          const col = String.fromCharCode(65 + idx);
          const txt = cell.formattedValue || '';
          const fmt = cell.effectiveFormat;
          const fontSize = fmt?.textFormat?.fontSize;
          const bold = fmt?.textFormat?.bold;
          const horizAlign = fmt?.horizontalAlignment;
          const fmtPattern = fmt?.numberFormat?.pattern;
          console.log(
            `      [書式] ${col}7: "${txt}" fontSize=${fontSize} bold=${bold} align=${horizAlign} numFmt=${fmtPattern || '-'}`,
          );
        });
      }
    } catch (e: any) {
      console.log(`   ❌ 読み取りエラー: ${e.message}`);
      if (e.response?.data) {
        console.log(`      詳細: ${JSON.stringify(e.response.data).slice(0, 300)}`);
      }
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
