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
  invoice_registration_number?: string;
  invoice_notes?: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    amount: number;
    delivery_date?: string;
    unit?: string;
    tax_rate: number;
    subtotal: number;
    tax_amount: number;
  }[];
  subtotal_8: number;
  tax_8: number;
  subtotal_10: number;
  tax_10: number;
  total_tax: number;
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
  invoice_registration_number?: string;
  billing_cycle?: string;
  billing_day?: number;
  payment_terms?: string;
  invoice_notes?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate?: number;
    subtotal?: number;
    tax_amount?: number;
  }[];
  subtotal_8?: number;
  tax_8?: number;
  subtotal_10?: number;
  tax_10?: number;
  total_tax: number;
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

  async createDeliverySheet(data: DeliveryData, templateFileId: string): Promise<{ sheetId: string; url: string }> {
    try {
      this.validateDeliveryData(data);

      console.log('📊 Creating delivery sheet with template file ID:', templateFileId);

      // テンプレートファイルをコピー（Drive API使用）
      const drive = google.drive({ version: 'v3', auth: this.auth });
      const newFileName = `納品書_${data.delivery_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;

      console.log('📋 Copying template file:', { templateFileId, newFileName });

      let copiedFile;
      try {
        copiedFile = await drive.files.copy({
          fileId: templateFileId,
          requestBody: {
            name: newFileName
          }
        });
      } catch (copyError: any) {
        console.error('❌ File copy failed:', {
          templateFileId,
          newFileName,
          error: copyError.message,
          code: copyError.code,
          status: copyError.status
        });

        if (copyError.code === 404) {
          throw new GoogleSheetsError(
            `納品書テンプレートファイル(ID: ${templateFileId})が見つかりません。テンプレート設定を確認してください。`,
            copyError,
            GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
          );
        } else if (copyError.code === 403) {
          throw new GoogleSheetsError(
            `納品書テンプレートファイル(ID: ${templateFileId})にアクセス権限がありません。共有設定を確認してください。`,
            copyError,
            GoogleSheetsErrorCode.PERMISSION_DENIED
          );
        }

        throw copyError;
      }

      if (!copiedFile.data.id) {
        throw new GoogleSheetsError('ファイルのコピーに失敗しました', undefined, GoogleSheetsErrorCode.UNKNOWN_ERROR);
      }

      const newFileId = copiedFile.data.id;
      console.log('✅ File copied successfully:', { newFileId, newFileName });

      // データを更新
      try {
        await this.updateDeliverySheet(newFileId, data);
        console.log('✅ Sheet data updated successfully');
      } catch (updateError: any) {
        console.error('❌ Sheet data update failed:', updateError);
        throw new GoogleSheetsError(
          'Google Sheetsは作成されましたが、データの更新に失敗しました。手動でデータを入力してください。',
          updateError,
          GoogleSheetsErrorCode.UNKNOWN_ERROR
        );
      }

      const url = `https://docs.google.com/spreadsheets/d/${newFileId}`;

      console.log('🎉 Delivery sheet creation completed:', { sheetId: newFileId, url });

      return { sheetId: newFileId, url };
    } catch (error) {
      console.error('❌ Error in createDeliverySheet:', error);

      if (error instanceof GoogleSheetsError) {
        throw error;
      }

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

  private async updateDeliverySheet(spreadsheetId: string, data: DeliveryData) {
    console.log('📊 Updating delivery sheet:', { spreadsheetId });

    const updates = [
      // 基本情報
      { range: 'B3', values: [[data.delivery_number]] },
      { range: 'B4', values: [[data.delivery_date]] },
      { range: 'B5', values: [[data.customer_name]] },
      { range: 'B6', values: [[data.customer_address || '']] },
      { range: 'B7', values: [[data.invoice_registration_number || '']] },
      { range: 'B8', values: [[data.invoice_notes || '']] },
    ];

    // 商品明細（A11から開始）
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `A${row}`, values: [[item.product_name]] },
        { range: `B${row}`, values: [[item.delivery_date || '']] },
        { range: `C${row}`, values: [[item.quantity]] },
        { range: `D${row}`, values: [[item.unit || '']] },
        { range: `E${row}`, values: [[item.unit_price]] },
        { range: `F${row}`, values: [[item.tax_rate]] },
        { range: `G${row}`, values: [[item.subtotal]] },
        { range: `H${row}`, values: [[item.tax_amount]] },
        { range: `I${row}`, values: [[item.amount]] }
      );
    });

    // 税率別集計（商品明細の下 + 2行）
    const summaryStartRow = itemsStartRow + data.items.length + 2;
    updates.push(
      { range: `B${summaryStartRow}`, values: [['8%対象額']] },
      { range: `C${summaryStartRow}`, values: [[data.subtotal_8]] },
      { range: `B${summaryStartRow + 1}`, values: [['8%消費税']] },
      { range: `C${summaryStartRow + 1}`, values: [[data.tax_8]] },
      { range: `B${summaryStartRow + 2}`, values: [['10%対象額']] },
      { range: `C${summaryStartRow + 2}`, values: [[data.subtotal_10]] },
      { range: `B${summaryStartRow + 3}`, values: [['10%消費税']] },
      { range: `C${summaryStartRow + 3}`, values: [[data.tax_10]] },
      { range: `B${summaryStartRow + 4}`, values: [['合計税額']] },
      { range: `C${summaryStartRow + 4}`, values: [[data.total_tax]] },
      { range: `B${summaryStartRow + 5}`, values: [['合計金額（税込）']] },
      { range: `C${summaryStartRow + 5}`, values: [[data.total_amount]] }
    );

    // 備考
    if (data.notes) {
      updates.push({ range: `A${summaryStartRow + 8}`, values: [[data.notes]] });
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
      { range: 'B9', values: [[data.invoice_registration_number || '']] },
      { range: 'B10', values: [[data.billing_cycle || '']] },
      { range: 'B11', values: [[data.billing_day || '']] },
      { range: 'B12', values: [[data.payment_terms || '']] },
      { range: 'B13', values: [[data.invoice_notes || '']] },
    ];

    // 商品明細（A15から開始）
    const itemsStartRow = 15;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `A${row}`, values: [[item.description]] },
        { range: `B${row}`, values: [[item.quantity]] },
        { range: `C${row}`, values: [[item.unit_price]] },
        { range: `D${row}`, values: [[item.tax_rate || 10]] },
        { range: `E${row}`, values: [[item.subtotal || item.amount]] },
        { range: `F${row}`, values: [[item.tax_amount || 0]] },
        { range: `G${row}`, values: [[item.amount]] }
      );
    });

    // 税率別集計（商品明細の下 + 2行）
    const summaryStartRow = itemsStartRow + data.items.length + 2;
    updates.push(
      { range: `B${summaryStartRow}`, values: [['8%対象額']] },
      { range: `C${summaryStartRow}`, values: [[data.subtotal_8 || 0]] },
      { range: `B${summaryStartRow + 1}`, values: [['8%消費税']] },
      { range: `C${summaryStartRow + 1}`, values: [[data.tax_8 || 0]] },
      { range: `B${summaryStartRow + 2}`, values: [['10%対象額']] },
      { range: `C${summaryStartRow + 2}`, values: [[data.subtotal_10 || 0]] },
      { range: `B${summaryStartRow + 3}`, values: [['10%消費税']] },
      { range: `C${summaryStartRow + 3}`, values: [[data.tax_10 || 0]] },
      { range: `B${summaryStartRow + 4}`, values: [['小計（税抜）']] },
      { range: `C${summaryStartRow + 4}`, values: [[data.subtotal]] },
      { range: `B${summaryStartRow + 5}`, values: [['合計税額']] },
      { range: `C${summaryStartRow + 5}`, values: [[data.total_tax]] },
      { range: `B${summaryStartRow + 6}`, values: [['合計金額（税込）']] },
      { range: `C${summaryStartRow + 6}`, values: [[data.total_amount]] }
    );

    // 備考
    if (data.notes) {
      updates.push({ range: `A${summaryStartRow + 9}`, values: [[data.notes]] });
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

  async exportToPdf(fileId: string): Promise<string> {
    try {
      console.log('📕 Exporting PDF for file:', { fileId });

      // Google SheetsのPDFエクスポートURL（ファイルベース）
      const pdfUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf`;

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
  console.log('🔧 getGoogleSheetsClient called - checking singleton instance');

  if (!googleSheetsClient) {
    console.log('🔧 Creating new GoogleSheetsClient instance');

    const config = {
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY!,
      projectId: process.env.GOOGLE_SHEETS_PROJECT_ID!
    };

    console.log('🔧 Environment config check:', {
      hasClientEmail: !!config.clientEmail,
      hasPrivateKey: !!config.privateKey,
      hasProjectId: !!config.projectId,
      clientEmailLength: config.clientEmail?.length || 0,
      privateKeyLength: config.privateKey?.length || 0,
      projectIdLength: config.projectId?.length || 0,
      privateKeyFormat: config.privateKey?.includes('-----BEGIN PRIVATE KEY-----')
    });

    if (!config.clientEmail || !config.privateKey || !config.projectId) {
      console.error('❌ Missing Google Sheets environment variables');
      throw new GoogleSheetsError(
        'Google Sheets認証情報が設定されていません。環境変数を確認してください。',
        undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }

    try {
      console.log('🔧 Attempting to create GoogleSheetsClient');
      googleSheetsClient = new GoogleSheetsClient(config);
      console.log('✅ GoogleSheetsClient created successfully');
    } catch (error) {
      console.error('❌ Failed to create GoogleSheetsClient:', error);
      throw error;
    }
  } else {
    console.log('✅ Reusing existing GoogleSheetsClient instance');
  }

  return googleSheetsClient;
}

export type { DeliveryData, InvoiceData };
export { GoogleSheetsError, GoogleSheetsErrorCode };