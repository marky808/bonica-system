import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

class GoogleSheetsError extends Error {
  constructor(message: string, public cause?: Error, public code?: string) {
    super(message);
    this.name = 'GoogleSheetsError';
  }
}

enum GoogleSheetsErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface DeliveryData {
  delivery_number: string;
  delivery_date: string;
  customer_name: string;
  customer_address?: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
  total_amount: number;
  notes?: string;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_address?: string;
  billing_address?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

class GoogleSheetsClient {
  private auth: JWT;
  private sheets: any;

  constructor(config: GoogleSheetsConfig) {
    this.validateConfig(config);
    
    try {
      this.auth = new JWT({
        email: config.clientEmail,
        key: config.privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (error) {
      throw new GoogleSheetsError(
        'Google Sheets認証の初期化に失敗しました', 
        error instanceof Error ? error : undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }
  }

  private validateConfig(config: GoogleSheetsConfig): void {
    if (!config.clientEmail) {
      throw new GoogleSheetsError('GOOGLE_SHEETS_CLIENT_EMAIL環境変数が設定されていません', undefined, GoogleSheetsErrorCode.AUTHENTICATION_FAILED);
    }
    if (!config.privateKey) {
      throw new GoogleSheetsError('GOOGLE_SHEETS_PRIVATE_KEY環境変数が設定されていません', undefined, GoogleSheetsErrorCode.AUTHENTICATION_FAILED);
    }
    if (!config.projectId) {
      throw new GoogleSheetsError('GOOGLE_SHEETS_PROJECT_ID環境変数が設定されていません', undefined, GoogleSheetsErrorCode.AUTHENTICATION_FAILED);
    }
  }

  private handleGoogleAPIError(error: any, context: string): never {
    console.error(`Google Sheets API Error in ${context}:`, error);
    
    if (error.code === 401) {
      throw new GoogleSheetsError(
        'Google Sheets API認証に失敗しました。認証情報を確認してください。',
        error,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }
    
    if (error.code === 403) {
      throw new GoogleSheetsError(
        'Google Sheets APIへのアクセス権限がありません。サービスアカウントの権限を確認してください。',
        error,
        GoogleSheetsErrorCode.PERMISSION_DENIED
      );
    }
    
    if (error.code === 404) {
      throw new GoogleSheetsError(
        '指定されたテンプレートが見つかりません。テンプレートIDを確認してください。',
        error,
        GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
      );
    }
    
    if (error.code === 429) {
      throw new GoogleSheetsError(
        'Google Sheets APIの利用制限に達しました。しばらく時間をおいて再試行してください。',
        error,
        GoogleSheetsErrorCode.QUOTA_EXCEEDED
      );
    }
    
    if (error.code >= 500) {
      throw new GoogleSheetsError(
        'Google Sheetsサーバーでエラーが発生しました。しばらく時間をおいて再試行してください。',
        error,
        GoogleSheetsErrorCode.NETWORK_ERROR
      );
    }
    
    throw new GoogleSheetsError(
      `Google Sheets操作中にエラーが発生しました: ${error.message || 'Unknown error'}`,
      error,
      GoogleSheetsErrorCode.UNKNOWN_ERROR
    );
  }

  async createDeliverySheet(data: DeliveryData, templateSheetId: string): Promise<{ sheetId: string; url: string }> {
    try {
      this.validateDeliveryData(data);
      
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new GoogleSheetsError('スプレッドシートIDが設定されていません', undefined, GoogleSheetsErrorCode.UNKNOWN_ERROR);
      }

      console.log('📊 Creating delivery sheet with:', { spreadsheetId, templateSheetId });

      // テンプレートIDの詳細検証と数値変換の強化
      let sourceSheetId: number;
      try {
        // 空文字やnull/undefinedチェック
        if (!templateSheetId || templateSheetId.trim() === '') {
          throw new Error('Template sheet ID is empty or undefined');
        }

        // 数値変換前のフォーマットチェック
        const trimmedId = templateSheetId.trim();
        if (!/^\d+$/.test(trimmedId)) {
          throw new Error(`Template sheet ID contains non-numeric characters: "${trimmedId}"`);
        }

        sourceSheetId = parseInt(trimmedId, 10);
        
        // 変換後の値の妥当性チェック
        if (isNaN(sourceSheetId) || sourceSheetId < 0) {
          throw new Error(`Invalid template sheet ID after parsing: ${sourceSheetId}`);
        }
        
        // Google Sheetsの実際の制限をチェック
        if (sourceSheetId > 2147483647) { // 32bit integer limit
          throw new Error(`Template sheet ID exceeds maximum value: ${sourceSheetId}`);
        }

        console.log('✅ Template sheet ID validated successfully:', sourceSheetId);
      } catch (parseError) {
        console.error('❌ Template sheet ID validation failed:', {
          originalId: templateSheetId,
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        
        throw new GoogleSheetsError(
          `テンプレートシートIDが無効です: "${templateSheetId}" - ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          parseError instanceof Error ? parseError : undefined,
          GoogleSheetsErrorCode.INVALID_DATA
        );
      }

      // 新しいシートを作成（テンプレートシートを複製）
      const newSheetName = `納品書_${data.delivery_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;

      console.log('📋 Duplicating sheet:', { sourceSheetId, newSheetName });

      let batchUpdateResponse;
      try {
        batchUpdateResponse = await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requestBody: {
            requests: [{
              duplicateSheet: {
                sourceSheetId: sourceSheetId,
                newSheetName: newSheetName
              }
            }]
          }
        });
      } catch (duplicateError: any) {
        console.error('❌ Sheet duplication failed:', {
          sourceSheetId,
          newSheetName,
          error: duplicateError.message,
          code: duplicateError.code,
          status: duplicateError.status
        });

        // より具体的なエラーメッセージを提供
        if (duplicateError.message?.includes('Invalid requests[0].duplicateSheet: Source sheet id') ||
            duplicateError.message?.includes('Unable to parse range')) {
          throw new GoogleSheetsError(
            `テンプレートシート(ID: ${sourceSheetId})が見つかりません。テンプレート設定を確認してください。`,
            duplicateError,
            GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
          );
        } else if (duplicateError.code === 403 || duplicateError.status === 403) {
          throw new GoogleSheetsError(
            `テンプレートシート(ID: ${sourceSheetId})にアクセス権限がありません。共有設定を確認してください。`,
            duplicateError,
            GoogleSheetsErrorCode.AUTH_ERROR
          );
        } else if (duplicateError.code === 404 || duplicateError.status === 404) {
          throw new GoogleSheetsError(
            `スプレッドシート(ID: ${spreadsheetId})またはテンプレートシート(ID: ${sourceSheetId})が見つかりません。`,
            duplicateError,
            GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
          );
        }
        
        throw duplicateError;
      }

      const newSheetId = batchUpdateResponse.data.replies![0].duplicateSheet!.properties!.sheetId!.toString();
      
      console.log('✅ Sheet duplicated successfully:', { newSheetId, newSheetName });

      // データを更新（シート名を使用）
      try {
        await this.updateDeliverySheet(spreadsheetId, newSheetName, data);
        console.log('✅ Sheet data updated successfully');
      } catch (updateError: any) {
        console.error('❌ Sheet data update failed:', updateError);
        // 作成されたシートは残すが、データ更新失敗として処理
        throw new GoogleSheetsError(
          'Google Sheetsは作成されましたが、データの更新に失敗しました。手動でデータを入力してください。',
          updateError,
          GoogleSheetsErrorCode.UNKNOWN_ERROR
        );
      }

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${newSheetId}`;
      
      console.log('🎉 Delivery sheet creation completed:', { sheetId: newSheetId, url });
      
      return { sheetId: newSheetId, url };
    } catch (error) {
      console.error('❌ Error in createDeliverySheet:', error);
      
      if (error instanceof GoogleSheetsError) {
        throw error;
      }
      
      // より詳細なエラー情報をログ出力
      if (error && typeof error === 'object') {
        console.error('❌ Error details:', {
          name: (error as any).name,
          message: (error as any).message,
          code: (error as any).code,
          status: (error as any).status,
          errors: (error as any).errors
        });
      }
      
      this.handleGoogleAPIError(error, 'createDeliverySheet');
    }
  }

  private validateDeliveryData(data: DeliveryData): void {
    if (!data.delivery_number) {
      throw new GoogleSheetsError('納品番号が必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
    if (!data.customer_name) {
      throw new GoogleSheetsError('顧客名が必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
    if (!data.items || data.items.length === 0) {
      throw new GoogleSheetsError('納品アイテムが必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
  }

  async createInvoiceSheet(data: InvoiceData, templateId: string): Promise<{ sheetId: string; url: string }> {
    try {
      this.validateInvoiceData(data);
      
      // テンプレートをコピー
      const drive = google.drive({ version: 'v3', auth: this.auth });
      const copiedFile = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: `請求書_${data.invoice_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`
        }
      });

      if (!copiedFile.data.id) {
        throw new GoogleSheetsError('ファイルのコピーに失敗しました', undefined, GoogleSheetsErrorCode.UNKNOWN_ERROR);
      }

      const newSheetId = copiedFile.data.id;

      // データを挿入
      await this.updateInvoiceSheet(newSheetId, data);

      const url = `https://docs.google.com/spreadsheets/d/${newSheetId}`;
      return { sheetId: newSheetId, url };
    } catch (error) {
      if (error instanceof GoogleSheetsError) {
        throw error;
      }
      this.handleGoogleAPIError(error, 'createInvoiceSheet');
    }
  }

  private validateInvoiceData(data: InvoiceData): void {
    if (!data.invoice_number) {
      throw new GoogleSheetsError('請求書番号が必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
    if (!data.customer_name) {
      throw new GoogleSheetsError('顧客名が必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
    if (!data.items || data.items.length === 0) {
      throw new GoogleSheetsError('請求アイテムが必要です', undefined, GoogleSheetsErrorCode.INVALID_DATA);
    }
  }

  private async updateDeliverySheet(spreadsheetId: string, sheetName: string, data: DeliveryData) {
    console.log('📊 Updating delivery sheet:', { spreadsheetId, sheetName });
    
    const updates = [
      // 基本情報
      { range: `'${sheetName}'!B3`, values: [[data.delivery_number]] },
      { range: `'${sheetName}'!B4`, values: [[data.delivery_date]] },
      { range: `'${sheetName}'!B5`, values: [[data.customer_name]] },
      { range: `'${sheetName}'!B6`, values: [[data.customer_address || '']] },
    ];

    // 商品明細（A11から開始 - BONICAシステム仕様準拠）
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `'${sheetName}'!A${row}`, values: [[item.product_name]] },
        { range: `'${sheetName}'!B${row}`, values: [[item.quantity]] },
        { range: `'${sheetName}'!C${row}`, values: [[item.unit_price]] },
        { range: `'${sheetName}'!D${row}`, values: [[item.amount]] }
      );
    });

    // 合計金額
    updates.push({ range: `'${sheetName}'!D${itemsStartRow + data.items.length + 2}`, values: [[data.total_amount]] });

    // 備考
    if (data.notes) {
      updates.push({ range: `'${sheetName}'!A${itemsStartRow + data.items.length + 5}`, values: [[data.notes]] });
    }

    console.log('📊 Batch update ranges:', updates.map(u => u.range));

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates
      }
    });

    console.log('✅ Delivery sheet updated successfully');
  }

  private async updateInvoiceSheet(sheetId: string, data: InvoiceData) {
    const updates = [
      // 基本情報
      { range: 'B3', values: [[data.invoice_number]] },
      { range: 'B4', values: [[data.invoice_date]] },
      { range: 'B5', values: [[data.due_date]] },
      { range: 'B6', values: [[data.customer_name]] },
      { range: 'B7', values: [[data.customer_address || '']] },
      { range: 'B8', values: [[data.billing_address || '']] },
    ];

    // 商品明細（A13から開始 - BONICAシステム仕様準拠）
    const itemsStartRow = 13;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `A${row}`, values: [[item.description]] },
        { range: `B${row}`, values: [[item.quantity]] },
        { range: `C${row}`, values: [[item.unit_price]] },
        { range: `D${row}`, values: [[item.amount]] }
      );
    });

    // 金額計算
    const totalsStartRow = itemsStartRow + data.items.length + 2;
    updates.push(
      { range: `D${totalsStartRow}`, values: [[data.subtotal]] },
      { range: `D${totalsStartRow + 1}`, values: [[data.tax_amount]] },
      { range: `D${totalsStartRow + 2}`, values: [[data.total_amount]] }
    );

    // 備考
    if (data.notes) {
      updates.push({ range: `A${totalsStartRow + 5}`, values: [[data.notes]] });
    }

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates
      }
    });
  }

  async shareSheet(sheetId: string, emails: string[] = []): Promise<void> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });
      
      // 共有リンクを有効化
      await drive.permissions.create({
        fileId: sheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // 指定されたメールアドレスに編集権限を付与
      for (const email of emails) {
        await drive.permissions.create({
          fileId: sheetId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: email
          }
        });
      }
    } catch (error) {
      if (error instanceof GoogleSheetsError) {
        throw error;
      }
      this.handleGoogleAPIError(error, 'shareSheet');
    }
  }

  async exportToPdf(sheetId: string): Promise<string> {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new GoogleSheetsError('スプレッドシートIDが設定されていません', undefined, GoogleSheetsErrorCode.UNKNOWN_ERROR);
      }

      console.log('📕 Exporting PDF for sheet:', { spreadsheetId, sheetId });

      // Google SheetsのPDFエクスポートURL（直接アクセス可能）
      const pdfUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&gid=${sheetId}`;

      console.log('✅ PDF URL generated:', pdfUrl);
      return pdfUrl;
    } catch (error) {
      console.error('❌ PDF export error:', error);
      if (error instanceof GoogleSheetsError) {
        throw error;
      }
      throw new GoogleSheetsError(
        'PDFエクスポートに失敗しました',
        error instanceof Error ? error : undefined,
        GoogleSheetsErrorCode.UNKNOWN_ERROR
      );
    }
  }
}

// シングルトンインスタンス
let googleSheetsClient: GoogleSheetsClient | null = null;

export function getGoogleSheetsClient(): GoogleSheetsClient {
  if (!googleSheetsClient) {
    const config = {
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY!,
      projectId: process.env.GOOGLE_SHEETS_PROJECT_ID!
    };

    if (!config.clientEmail || !config.privateKey || !config.projectId) {
      throw new GoogleSheetsError(
        'Google Sheets認証情報が設定されていません。環境変数を確認してください。',
        undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }

    googleSheetsClient = new GoogleSheetsClient(config);
  }

  return googleSheetsClient;
}

export type { DeliveryData, InvoiceData };
export { GoogleSheetsError, GoogleSheetsErrorCode };