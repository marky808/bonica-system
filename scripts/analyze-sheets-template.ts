#!/usr/bin/env tsx

/**
 * Google Sheetsテンプレート分析スクリプト
 * 納品書と請求書のテンプレートの構造を詳細に解析します
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数から設定を読み込む
const DELIVERY_TEMPLATE_ID = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID || '1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ';
const INVOICE_TEMPLATE_ID = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID || '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY';

const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

interface CellData {
  value: any;
  formattedValue?: string;
  userEnteredValue?: any;
  effectiveValue?: any;
  userEnteredFormat?: any;
  effectiveFormat?: any;
  note?: string;
}

interface SheetAnalysis {
  spreadsheetId: string;
  title: string;
  sheets: {
    sheetId: number;
    title: string;
    gridProperties: any;
    cells: CellData[][];
    merges: any[];
    conditionalFormats: any[];
    dataValidations: any[];
  }[];
}

async function getAuthClient(): Promise<OAuth2Client> {
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
    throw new Error('OAuth認証情報が設定されていません');
  }

  const oauth2Client = new OAuth2Client(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    'http://localhost'
  );

  oauth2Client.setCredentials({
    refresh_token: OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

async function analyzeSpreadsheet(spreadsheetId: string, name: string): Promise<void> {
  console.log(`\n========================================`);
  console.log(`${name}の分析を開始します`);
  console.log(`========================================\n`);

  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // スプレッドシートの基本情報を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true,
      ranges: [], // 全てのシートを取得
    });

    const analysis: SheetAnalysis = {
      spreadsheetId,
      title: spreadsheet.data.properties?.title || '',
      sheets: [],
    };

    console.log(`スプレッドシート名: ${analysis.title}`);
    console.log(`シート数: ${spreadsheet.data.sheets?.length || 0}\n`);

    // 各シートを分析
    for (const sheet of spreadsheet.data.sheets || []) {
      const sheetTitle = sheet.properties?.title || '';
      console.log(`\n--- シート: ${sheetTitle} ---`);

      const sheetData = {
        sheetId: sheet.properties?.sheetId || 0,
        title: sheetTitle,
        gridProperties: sheet.properties?.gridProperties,
        cells: [] as CellData[][],
        merges: sheet.merges || [],
        conditionalFormats: sheet.conditionalFormats || [],
        dataValidations: sheet.dataValidations || [],
      };

      console.log(`行数: ${sheetData.gridProperties?.rowCount}`);
      console.log(`列数: ${sheetData.gridProperties?.columnCount}`);
      console.log(`セル結合: ${sheetData.merges.length}箇所`);

      // グリッドデータを解析
      if (sheet.data && sheet.data.length > 0) {
        const gridData = sheet.data[0];
        const rowData = gridData.rowData || [];

        console.log(`\n📊 セルデータの解析...`);

        for (let rowIndex = 0; rowIndex < rowData.length; rowIndex++) {
          const row = rowData[rowIndex];
          const cellRow: CellData[] = [];

          if (row.values) {
            for (let colIndex = 0; colIndex < row.values.length; colIndex++) {
              const cell = row.values[colIndex];

              const cellData: CellData = {
                value: cell.formattedValue || '',
                formattedValue: cell.formattedValue,
                userEnteredValue: cell.userEnteredValue,
                effectiveValue: cell.effectiveValue,
                userEnteredFormat: cell.userEnteredFormat,
                effectiveFormat: cell.effectiveFormat,
                note: cell.note,
              };

              cellRow.push(cellData);

              // 重要なセル（値がある、または書式がある）をログ出力
              if (cellData.formattedValue || cellData.userEnteredFormat) {
                const colLetter = String.fromCharCode(65 + colIndex);
                const cellAddress = `${colLetter}${rowIndex + 1}`;

                if (cellData.formattedValue && rowIndex < 70) { // 最初の70行のみ表示
                  console.log(`  ${cellAddress}: ${cellData.formattedValue}`);

                  // 数式がある場合
                  if (cellData.userEnteredValue?.formulaValue) {
                    console.log(`    数式: ${cellData.userEnteredValue.formulaValue}`);
                  }

                  // 背景色がある場合
                  if (cellData.effectiveFormat?.backgroundColor) {
                    const bg = cellData.effectiveFormat.backgroundColor;
                    console.log(`    背景色: RGB(${bg.red || 0}, ${bg.green || 0}, ${bg.blue || 0})`);
                  }

                  // フォント情報
                  if (cellData.effectiveFormat?.textFormat) {
                    const tf = cellData.effectiveFormat.textFormat;
                    console.log(`    フォント: ${tf.fontFamily || 'デフォルト'}, ${tf.fontSize || 10}pt, 太字: ${tf.bold || false}`);
                  }
                }
              }
            }
          }

          sheetData.cells.push(cellRow);
        }

        // セル結合の詳細
        if (sheetData.merges.length > 0) {
          console.log(`\n📌 セル結合の詳細:`);
          sheetData.merges.forEach((merge, index) => {
            const startCol = String.fromCharCode(65 + (merge.startColumnIndex || 0));
            const endCol = String.fromCharCode(65 + ((merge.endColumnIndex || 1) - 1));
            const startRow = (merge.startRowIndex || 0) + 1;
            const endRow = (merge.endRowIndex || 1);
            console.log(`  ${index + 1}. ${startCol}${startRow}:${endCol}${endRow}`);
          });
        }
      }

      analysis.sheets.push(sheetData);
    }

    // 結果をJSONファイルに保存
    const outputDir = path.join(process.cwd(), 'analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${name.replace(/\s+/g, '_')}_analysis.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`\n✅ 分析結果を保存しました: ${filepath}`);

  } catch (error: any) {
    console.error(`❌ エラーが発生しました:`, error.message);
    if (error.response) {
      console.error('詳細:', error.response.data);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('Google Sheetsテンプレート分析ツール');
    console.log('======================================\n');

    // 納品書テンプレートを分析
    await analyzeSpreadsheet(DELIVERY_TEMPLATE_ID, '納品書テンプレート');

    // 請求書テンプレートを分析
    await analyzeSpreadsheet(INVOICE_TEMPLATE_ID, '請求書テンプレート');

    console.log('\n\n========================================');
    console.log('✅ 全ての分析が完了しました');
    console.log('========================================\n');

  } catch (error) {
    console.error('分析に失敗しました:', error);
    process.exit(1);
  }
}

main();
