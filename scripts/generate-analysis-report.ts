#!/usr/bin/env tsx

/**
 * 分析レポート生成スクリプト
 * JSONファイルから読みやすいマークダウンレポートを生成
 */

import * as fs from 'fs';
import * as path from 'path';

interface CellData {
  value: any;
  formattedValue?: string;
  userEnteredValue?: any;
  effectiveFormat?: any;
}

interface SheetData {
  title: string;
  gridProperties: any;
  cells: CellData[][];
  merges: any[];
}

interface SheetAnalysis {
  spreadsheetId: string;
  title: string;
  sheets: SheetData[];
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function getCellAddress(row: number, col: number): string {
  return `${getColumnLetter(col)}${row + 1}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function analyzeSheet(sheetData: SheetData): string {
  let report = '';

  report += `## ${sheetData.title}\n\n`;
  report += `### 基本情報\n`;
  report += `- 行数: ${sheetData.gridProperties.rowCount}\n`;
  report += `- 列数: ${sheetData.gridProperties.columnCount}\n`;
  report += `- セル結合: ${sheetData.merges.length}箇所\n\n`;

  // ヘッダー部分の分析（1-10行目）
  report += `### ヘッダー部分（1-10行目）\n\n`;

  const headerRows = Math.min(10, sheetData.cells.length);
  for (let rowIndex = 0; rowIndex < headerRows; rowIndex++) {
    const row = sheetData.cells[rowIndex];
    if (!row) continue;

    for (let colIndex = 0; colIndex < Math.min(10, row.length); colIndex++) {
      const cell = row[colIndex];
      if (!cell || !cell.formattedValue) continue;

      const cellAddr = getCellAddress(rowIndex, colIndex);
      report += `#### ${cellAddr}: ${cell.formattedValue}\n`;

      // 数式
      if (cell.userEnteredValue?.formulaValue) {
        report += `- **数式**: \`${cell.userEnteredValue.formulaValue}\`\n`;
      }

      // 書式情報
      if (cell.effectiveFormat) {
        const fmt = cell.effectiveFormat;

        // 背景色
        if (fmt.backgroundColor && (fmt.backgroundColor.red !== 1 || fmt.backgroundColor.green !== 1 || fmt.backgroundColor.blue !== 1)) {
          const hex = rgbToHex(
            fmt.backgroundColor.red || 0,
            fmt.backgroundColor.green || 0,
            fmt.backgroundColor.blue || 0
          );
          report += `- **背景色**: ${hex}\n`;
        }

        // フォント
        if (fmt.textFormat) {
          const tf = fmt.textFormat;
          report += `- **フォント**: ${tf.fontFamily || 'デフォルト'}, ${tf.fontSize || 10}pt`;
          if (tf.bold) report += `, **太字**`;
          report += `\n`;
        }

        // 配置
        if (fmt.horizontalAlignment && fmt.horizontalAlignment !== 'LEFT') {
          report += `- **横位置**: ${fmt.horizontalAlignment}\n`;
        }
      }

      report += `\n`;
    }
  }

  // 明細テーブルの分析（10行目以降）
  report += `### 明細テーブル部分\n\n`;

  const tableHeaderRow = 9; // 10行目（0-indexed）
  if (sheetData.cells.length > tableHeaderRow) {
    const headerRow = sheetData.cells[tableHeaderRow];

    report += `#### ヘッダー行（${tableHeaderRow + 1}行目）\n\n`;
    report += `| 列 | セル | 項目名 | 背景色 |\n`;
    report += `|----|------|--------|--------|\n`;

    for (let colIndex = 0; colIndex < Math.min(15, headerRow.length); colIndex++) {
      const cell = headerRow[colIndex];
      if (!cell || !cell.formattedValue) continue;

      const cellAddr = getCellAddress(tableHeaderRow, colIndex);
      const bgColor = cell.effectiveFormat?.backgroundColor;
      const hex = bgColor ? rgbToHex(bgColor.red || 0, bgColor.green || 0, bgColor.blue || 0) : '-';

      report += `| ${getColumnLetter(colIndex)} | ${cellAddr} | ${cell.formattedValue} | ${hex} |\n`;
    }
    report += `\n`;

    // サンプルデータ行（11-15行目）
    report += `#### サンプルデータ（11-15行目）\n\n`;
    for (let rowIndex = tableHeaderRow + 1; rowIndex < Math.min(tableHeaderRow + 6, sheetData.cells.length); rowIndex++) {
      const row = sheetData.cells[rowIndex];
      if (!row) continue;

      let hasData = false;
      let rowData = `**${rowIndex + 1}行目**: `;

      for (let colIndex = 0; colIndex < Math.min(15, row.length); colIndex++) {
        const cell = row[colIndex];
        if (cell && cell.formattedValue) {
          rowData += `${getColumnLetter(colIndex)}="${cell.formattedValue}" `;
          hasData = true;
        }
      }

      if (hasData) {
        report += rowData + `\n`;
      }
    }
    report += `\n`;
  }

  // セル結合の詳細
  if (sheetData.merges.length > 0) {
    report += `### セル結合の詳細\n\n`;
    report += `| No. | 範囲 | 説明 |\n`;
    report += `|-----|------|------|\n`;

    sheetData.merges.forEach((merge, index) => {
      const startCol = getColumnLetter(merge.startColumnIndex || 0);
      const endCol = getColumnLetter((merge.endColumnIndex || 1) - 1);
      const startRow = (merge.startRowIndex || 0) + 1;
      const endRow = merge.endRowIndex || 1;
      const range = `${startCol}${startRow}:${endCol}${endRow}`;

      // セルの値を取得
      const startRowIndex = merge.startRowIndex || 0;
      const startColIndex = merge.startColumnIndex || 0;
      const cellValue = sheetData.cells[startRowIndex]?.[startColIndex]?.formattedValue || '';

      report += `| ${index + 1} | ${range} | ${cellValue} |\n`;
    });
    report += `\n`;
  }

  // 数式のサマリー
  report += `### 数式の一覧\n\n`;

  const formulas: { cell: string; formula: string }[] = [];

  for (let rowIndex = 0; rowIndex < Math.min(100, sheetData.cells.length); rowIndex++) {
    const row = sheetData.cells[rowIndex];
    if (!row) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      if (cell?.userEnteredValue?.formulaValue) {
        formulas.push({
          cell: getCellAddress(rowIndex, colIndex),
          formula: cell.userEnteredValue.formulaValue,
        });
      }
    }
  }

  if (formulas.length > 0) {
    report += `| セル | 数式 |\n`;
    report += `|------|------|\n`;
    formulas.forEach(({ cell, formula }) => {
      report += `| ${cell} | \`${formula}\` |\n`;
    });
  } else {
    report += `数式は見つかりませんでした。\n`;
  }
  report += `\n`;

  return report;
}

function main() {
  const analysisDir = path.join(process.cwd(), 'analysis');

  // 納品書テンプレートの分析
  const deliveryPath = path.join(analysisDir, '納品書テンプレート_analysis.json');
  const invoicePath = path.join(analysisDir, '請求書テンプレート_analysis.json');

  let report = `# Google Sheetsテンプレート構造分析レポート\n\n`;
  report += `生成日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  report += `---\n\n`;

  // 納品書
  if (fs.existsSync(deliveryPath)) {
    const data: SheetAnalysis = JSON.parse(fs.readFileSync(deliveryPath, 'utf-8'));
    report += `# 納品書テンプレートの分析\n\n`;
    report += `- **スプレッドシートID**: ${data.spreadsheetId}\n`;
    report += `- **タイトル**: ${data.title}\n`;
    report += `- **シート数**: ${data.sheets.length}\n\n`;
    report += `---\n\n`;

    data.sheets.forEach(sheet => {
      report += analyzeSheet(sheet);
      report += `---\n\n`;
    });
  }

  // 請求書
  if (fs.existsSync(invoicePath)) {
    const data: SheetAnalysis = JSON.parse(fs.readFileSync(invoicePath, 'utf-8'));
    report += `# 請求書テンプレートの分析\n\n`;
    report += `- **スプレッドシートID**: ${data.spreadsheetId}\n`;
    report += `- **タイトル**: ${data.title}\n`;
    report += `- **シート数**: ${data.sheets.length}\n\n`;
    report += `---\n\n`;

    data.sheets.forEach(sheet => {
      report += analyzeSheet(sheet);
      report += `---\n\n`;
    });
  }

  // レポートを保存
  const reportPath = path.join(analysisDir, 'TEMPLATE_STRUCTURE_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`\n✅ 分析レポートを生成しました: ${reportPath}\n`);
}

main();
