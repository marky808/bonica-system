/**
 * 新しい納品書テンプレートをGoogle Sheets APIで作成するスクリプト
 * PDFデザインに基づいた9列構造の納品書テンプレート
 */

import { google } from 'googleapis';

// OAuth2クライアントの作成
async function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'http://localhost:3000/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * 新しい納品書テンプレートを作成
 */
async function createNewDeliveryTemplate() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('新しいスプレッドシートを作成中...');

  // 1. 新しいスプレッドシートを作成
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'BONICA納品書テンプレート（新）',
        locale: 'ja_JP',
        timeZone: 'Asia/Tokyo',
      },
      sheets: [
        {
          properties: {
            title: '納品書テンプレート',
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
              frozenRowCount: 10, // ヘッダー行を固定
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0;

  console.log(`スプレッドシート作成完了: ${spreadsheetId}`);
  console.log(`シートID: ${sheetId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  // 2. セルの値と書式を一括で設定
  const requests: any[] = [];

  // 列幅の設定
  const columnWidths = [
    { column: 0, width: 100 },  // A: 日付
    { column: 1, width: 250 },  // B: 品名
    { column: 2, width: 100 },  // C: 単価
    { column: 3, width: 80 },   // D: 数量
    { column: 4, width: 60 },   // E: 単位
    { column: 5, width: 70 },   // F: 税率
    { column: 6, width: 120 },  // G: 税抜金額
    { column: 7, width: 100 },  // H: 消費税
    { column: 8, width: 200 },  // I: 備考
  ];

  columnWidths.forEach(({ column, width }) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: column,
          endIndex: column + 1,
        },
        properties: {
          pixelSize: width,
        },
        fields: 'pixelSize',
      },
    });
  });

  // タイトル行（1行目）- 薄紫のヘッダーバー（納品書は請求書と色を変える）
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 9,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredValue: {
          stringValue: '納品書',
        },
        userEnteredFormat: {
          backgroundColor: {
            red: 0.902,
            green: 0.902,
            blue: 0.980,
          },
          textFormat: {
            foregroundColor: {
              red: 0,
              green: 0,
              blue: 0,
            },
            fontSize: 18,
            bold: true,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 納品先情報（2-5行目）- 左側に配置（一般的な配置）
  // 2行目: お客様名（プレースホルダー）
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 4,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '{{customerName}} 御中',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 14,
            bold: true,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 3行目: お客様住所（プレースホルダー）
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 4,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '{{customerAddress}}',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 4行目: 納品日
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 0,
        endColumnIndex: 2,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '納品日: {{deliveryDate}}',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 4行目: 納品書番号（右寄せ）
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 2,
        endColumnIndex: 4,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredValue: {
          stringValue: '納品書番号: {{deliveryNumber}}',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 5行目: 空行

  // 会社情報ブロック（2-5行目）- 右側に配置（発行元）
  // 2行目: 会社名
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 5,
        endColumnIndex: 9,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: 'ボニカアグリジェント株式会社',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 14,
            bold: true,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 3行目: 法人番号
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 5,
        endColumnIndex: 9,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: '法人番号: T1234567890123',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 4行目: 住所
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 5,
        endColumnIndex: 9,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: '〒123-4567 東京都○○区○○ 1-2-3',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 5行目: 電話番号
  requests.push({
    mergeCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: 4,
        endRowIndex: 5,
        startColumnIndex: 5,
        endColumnIndex: 9,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 4,
        endRowIndex: 5,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: 'TEL: 03-1234-5678',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 6-8行目: 空行（レイアウト調整用）

  // 9行目: 空行

  // 10行目: 明細テーブルヘッダー（薄紫背景、黒文字）
  const headers = ['日付', '品名', '単価', '数量', '単位', '税率', '税抜金額', '消費税', '備考'];

  headers.forEach((header, index) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 9,
          endRowIndex: 10,
          startColumnIndex: index,
          endColumnIndex: index + 1,
        },
        cell: {
          userEnteredValue: {
            stringValue: header,
          },
          userEnteredFormat: {
            backgroundColor: {
              red: 0.902,
              green: 0.902,
              blue: 0.980,
            },
            textFormat: {
              foregroundColor: {
                red: 0,
                green: 0,
                blue: 0,
              },
              fontSize: 11,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            borders: {
              top: { style: 'SOLID', width: 1 },
              bottom: { style: 'SOLID', width: 1 },
              left: { style: 'SOLID', width: 1 },
              right: { style: 'SOLID', width: 1 },
            },
          },
        },
        fields: 'userEnteredValue,userEnteredFormat',
      },
    });
  });

  // 11-50行目: 明細行のテンプレート（罫線と数式）
  for (let row = 10; row < 50; row++) {
    // 日付列（A）
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 品名列（B）
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 単価列（C）- 通貨フォーマット
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '¥#,##0',
            },
            horizontalAlignment: 'RIGHT',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 数量列（D）- 数値フォーマット
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: '#,##0.##',
            },
            horizontalAlignment: 'RIGHT',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 単位列（E）
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 税率列（F）
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 5,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // 税抜金額列（G）- 計算式: =C*D
    const rowNum = row + 1;
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 6,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredValue: {
            formulaValue: `=IF(AND(C${rowNum}<>"", D${rowNum}<>""), C${rowNum}*D${rowNum}, "")`,
          },
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '¥#,##0',
            },
            horizontalAlignment: 'RIGHT',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredValue,userEnteredFormat',
      },
    });

    // 消費税列（H）- 計算式: =G*税率
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 7,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredValue: {
            formulaValue: `=IF(AND(G${rowNum}<>"", F${rowNum}<>""), ROUNDDOWN(G${rowNum}*VALUE(SUBSTITUTE(F${rowNum}, "%", ""))/100, 0), "")`,
          },
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '¥#,##0',
            },
            horizontalAlignment: 'RIGHT',
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredValue,userEnteredFormat',
      },
    });

    // 備考列（I）
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 8,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            borders: {
              top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });
  }

  // 51行目: 空行

  // 52行目以降: 集計ブロック
  // 税率別集計（8%/10%）
  const summaryStartRow = 51;

  // 「税率別集計」タイトル
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow,
        endRowIndex: summaryStartRow + 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '【税率別集計】',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 11,
            bold: true,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 8%対象
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 1,
        endRowIndex: summaryStartRow + 2,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '8%対象',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 1,
        endRowIndex: summaryStartRow + 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUMIF(F11:F50, "8%", G11:G50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 消費税（8%）
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 2,
        endRowIndex: summaryStartRow + 3,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '消費税（8%）',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 2,
        endRowIndex: summaryStartRow + 3,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUMIF(F11:F50, "8%", H11:H50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 10%対象
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 3,
        endRowIndex: summaryStartRow + 4,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '10%対象',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 3,
        endRowIndex: summaryStartRow + 4,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUMIF(F11:F50, "10%", G11:G50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 消費税（10%）
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 4,
        endRowIndex: summaryStartRow + 5,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredValue: {
          stringValue: '消費税（10%）',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: summaryStartRow + 4,
        endRowIndex: summaryStartRow + 5,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUMIF(F11:F50, "10%", H11:H50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 空行
  const totalStartRow = summaryStartRow + 6;

  // 小計
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow,
        endRowIndex: totalStartRow + 1,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: '小計',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 11,
            bold: true,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow,
        endRowIndex: totalStartRow + 1,
        startColumnIndex: 6,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUM(G11:G50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            bold: true,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 消費税合計
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow + 1,
        endRowIndex: totalStartRow + 2,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: '消費税',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 11,
            bold: true,
          },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow + 1,
        endRowIndex: totalStartRow + 2,
        startColumnIndex: 6,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=SUM(H11:H50)`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            bold: true,
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 合計（太線）
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow + 2,
        endRowIndex: totalStartRow + 3,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredValue: {
          stringValue: '合計',
        },
        userEnteredFormat: {
          textFormat: {
            fontSize: 12,
            bold: true,
          },
          horizontalAlignment: 'RIGHT',
          borders: {
            top: { style: 'SOLID_MEDIUM', width: 2 },
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: totalStartRow + 2,
        endRowIndex: totalStartRow + 3,
        startColumnIndex: 6,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredValue: {
          formulaValue: `=G${totalStartRow + 1}+G${totalStartRow + 2}`,
        },
        userEnteredFormat: {
          numberFormat: {
            type: 'CURRENCY',
            pattern: '¥#,##0',
          },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            fontSize: 12,
            bold: true,
          },
          borders: {
            top: { style: 'SOLID_MEDIUM', width: 2 },
            bottom: { style: 'DOUBLE', width: 3 },
          },
        },
      },
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 一括で書式設定を実行
  console.log(`${requests.length}個のリクエストを実行中...`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });

  console.log('✅ テンプレート作成完了！');
  console.log(`\nスプレッドシートURL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
  console.log('\n次のステップ:');
  console.log('1. 上記URLをブラウザで開いて視覚的に確認してください');
  console.log('2. 問題がなければ、このスプレッドシートIDを.env.localに設定してください');
  console.log(`   GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID="${spreadsheetId}"`);

  return spreadsheetId;
}

// スクリプト実行
createNewDeliveryTemplate()
  .then(() => {
    console.log('\n✅ 処理が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  });
