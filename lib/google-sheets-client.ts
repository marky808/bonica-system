import { google } from 'googleapis';
import { JWT, OAuth2Client } from 'google-auth-library';

interface GoogleSheetsConfig {
  clientEmail?: string;
  privateKey?: string;
  projectId?: string;
  // OAuth 2.0認証用の設定
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
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

// 新しい9列構造のテンプレート用（Phase 1で作成したテンプレート）
interface DeliveryDataV2 {
  delivery_number: string;
  delivery_date: string;
  customer_name: string;
  customer_address?: string;
  items: {
    date: string;              // A列: 日付 (MM/DD形式)
    product_name: string;      // B列: 品名
    unit_price: number;        // C列: 単価
    quantity: number;          // D列: 数量
    unit: string;              // E列: 単位 (kg, 袋, 箱など)
    tax_rate: string;          // F列: 税率 ("8%" or "10%")
    // G列: 税抜金額 (スプレッドシートで自動計算: =C*D)
    // H列: 消費税 (スプレッドシートで自動計算: =G*税率)
    notes?: string;            // I列: 備考
  }[];
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

// 新しい9列構造のテンプレート用（Phase 1で作成したテンプレート）
interface InvoiceDataV2 {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_address?: string;
  items: {
    date: string;              // A列: 日付 (MM/DD形式)
    product_name: string;      // B列: 品名
    unit_price: number;        // C列: 単価
    quantity: number;          // D列: 数量
    unit: string;              // E列: 単位 (kg, 袋, 箱など)
    tax_rate: string;          // F列: 税率 ("8%" or "10%")
    // G列: 税抜金額 (スプレッドシートで自動計算: =C*D)
    // H列: 消費税 (スプレッドシートで自動計算: =G*税率)
    notes?: string;            // I列: 備考
  }[];
}

class GoogleSheetsClient {
  private auth: JWT | OAuth2Client;
  private sheets: any;
  private authType: 'service-account' | 'oauth2';

  constructor(config: GoogleSheetsConfig) {
    this.validateConfig(config);

    try {
      // OAuth 2.0認証を優先的に使用
      if (config.oauthClientId && config.oauthClientSecret && config.oauthRefreshToken) {
        console.log('🔐 Initializing OAuth 2.0 authentication');

        this.auth = new OAuth2Client(
          config.oauthClientId,
          config.oauthClientSecret,
          'http://localhost:3000/api/auth/google/callback'  // リダイレクトURI
        );

        // リフレッシュトークンを設定
        this.auth.setCredentials({
          refresh_token: config.oauthRefreshToken,
        });

        this.authType = 'oauth2';
        console.log('✅ OAuth 2.0 authentication initialized');
      }
      // サービスアカウント認証（フォールバック）
      else if (config.clientEmail && config.privateKey) {
        console.log('🔐 Initializing Service Account authentication');

        this.auth = new JWT({
          email: config.clientEmail,
          key: config.privateKey.replace(/\\n/g, '\n'),
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });

        this.authType = 'service-account';
        console.log('✅ Service Account authentication initialized');
      } else {
        throw new Error('OAuth 2.0またはサービスアカウントの認証情報が必要です');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      throw new GoogleSheetsError(
        'Google Sheets認証の初期化に失敗しました',
        error instanceof Error ? error : undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }
  }

  private validateConfig(config: GoogleSheetsConfig): void {
    // OAuth 2.0認証情報をチェック
    const hasOAuth = !!(config.oauthClientId && config.oauthClientSecret && config.oauthRefreshToken);

    // サービスアカウント認証情報をチェック
    const hasServiceAccount = !!(config.clientEmail && config.privateKey && config.projectId);

    if (!hasOAuth && !hasServiceAccount) {
      throw new GoogleSheetsError(
        'OAuth 2.0またはサービスアカウントの認証情報が設定されていません。環境変数を確認してください。',
        undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }

    // OAuth 2.0が部分的にしか設定されていない場合は警告
    if ((config.oauthClientId || config.oauthClientSecret || config.oauthRefreshToken) && !hasOAuth) {
      console.warn('⚠️  OAuth 2.0認証情報が不完全です。以下すべてが必要です:');
      console.warn('   - GOOGLE_OAUTH_CLIENT_ID');
      console.warn('   - GOOGLE_OAUTH_CLIENT_SECRET');
      console.warn('   - GOOGLE_OAUTH_REFRESH_TOKEN');
      console.warn('   サービスアカウント認証にフォールバックします。');
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
      console.log('🔍 createDeliverySheet called with:', {
        templateFileId,
        templateFileIdType: typeof templateFileId,
        templateFileIdLength: templateFileId?.length,
        authType: this.authType,
      });

      this.validateDeliveryData(data);

      console.log(`📊 Creating delivery sheet from template (${this.authType}):`, templateFileId);

      const newFileName = `納品書_${data.delivery_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;
      let newFileId: string;

      // OAuth 2.0認証の場合はテンプレートをコピー
      if (this.authType === 'oauth2') {
        console.log('📋 Using OAuth2 - copying template file');

        try {
          const drive = google.drive({ version: 'v3', auth: this.auth });

          const copiedFile = await drive.files.copy({
            fileId: templateFileId,
            requestBody: {
              name: newFileName,
            },
          });

          newFileId = copiedFile.data.id!;
          console.log('✅ Template copied successfully:', { newFileId, newFileName });

        } catch (copyError: any) {
          console.error('❌ Template copy failed:', {
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
              `テンプレートのコピー権限がありません。テンプレートへのアクセス権を確認してください。`,
              copyError,
              GoogleSheetsErrorCode.PERMISSION_DENIED
            );
          }

          throw copyError;
        }

        // コピーしたファイルにデータを更新
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

        // シート名を変更（納品先名_日付）
        try {
          const sheetName = `${data.customer_name}_${data.delivery_date}`;
          console.log('📝 Renaming sheet to:', sheetName);

          // Get the first sheet ID
          const spreadsheet = await this.sheets.spreadsheets.get({
            spreadsheetId: newFileId,
          });

          const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId;

          if (firstSheetId !== undefined) {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: newFileId,
              requestBody: {
                requests: [
                  {
                    updateSheetProperties: {
                      properties: {
                        sheetId: firstSheetId,
                        title: sheetName,
                      },
                      fields: 'title',
                    },
                  },
                ],
              },
            });
            console.log('✅ Sheet renamed successfully:', sheetName);
          } else {
            console.warn('⚠️ Could not find sheet ID for renaming');
          }
        } catch (renameError: any) {
          console.error('❌ Sheet rename failed (non-critical):', renameError);
          // シート名の変更は失敗しても続行
        }
      }
      // サービスアカウント認証の場合は空のスプレッドシートを作成
      else {
        console.log('📋 Using Service Account - creating empty spreadsheet');
        console.log('⚠️  WARNING: Service accounts have storage quota = 0, this may fail');

        try {
          const newSpreadsheet = await this.sheets.spreadsheets.create({
            requestBody: {
              properties: {
                title: newFileName,
              },
            },
          });

          newFileId = newSpreadsheet.data.spreadsheetId!;
          console.log('✅ New spreadsheet created:', { newFileId, newFileName });

        } catch (createError: any) {
          console.error('❌ Spreadsheet creation failed:', {
            error: createError.message,
            code: createError.code,
            status: createError.status
          });

          if (createError.code === 403) {
            throw new GoogleSheetsError(
              'スプレッドシートの作成権限がありません。サービスアカウントはストレージクォータ=0のため、OAuth 2.0認証の使用を推奨します。',
              createError,
              GoogleSheetsErrorCode.PERMISSION_DENIED
            );
          }

          throw createError;
        }

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

      console.log(`📊 Creating invoice sheet from template (${this.authType}):`, templateId);

      const newFileName = `請求書_${data.invoice_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;
      let newSheetId: string;

      // OAuth 2.0認証の場合はテンプレートをコピー
      if (this.authType === 'oauth2') {
        console.log('📋 Using OAuth2 - copying template file');

        try {
          const drive = google.drive({ version: 'v3', auth: this.auth });

          const copiedFile = await drive.files.copy({
            fileId: templateId,
            requestBody: {
              name: newFileName,
            },
          });

          newSheetId = copiedFile.data.id!;
          console.log('✅ Template copied successfully:', { newSheetId, newFileName });

        } catch (copyError: any) {
          console.error('❌ Template copy failed:', {
            error: copyError.message,
            code: copyError.code,
            status: copyError.status
          });

          if (copyError.code === 404) {
            throw new GoogleSheetsError(
              `請求書テンプレートファイル(ID: ${templateId})が見つかりません。テンプレート設定を確認してください。`,
              copyError,
              GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
            );
          } else if (copyError.code === 403) {
            throw new GoogleSheetsError(
              `テンプレートのコピー権限がありません。テンプレートへのアクセス権を確認してください。`,
              copyError,
              GoogleSheetsErrorCode.PERMISSION_DENIED
            );
          }

          throw copyError;
        }

        // コピーしたファイルにデータを更新
        try {
          await this.updateInvoiceSheet(newSheetId, data);
          console.log('✅ Invoice sheet data updated successfully');
        } catch (updateError: any) {
          console.error('❌ Invoice sheet data update failed:', updateError);
          throw new GoogleSheetsError(
            'Google Sheetsは作成されましたが、データの更新に失敗しました。手動でデータを入力してください。',
            updateError,
            GoogleSheetsErrorCode.UNKNOWN_ERROR
          );
        }
      }
      // サービスアカウント認証の場合は空のスプレッドシートを作成
      else {
        console.log('📋 Using Service Account - creating empty spreadsheet');
        console.log('⚠️  WARNING: Service accounts have storage quota = 0, this may fail');

        try {
          const newSpreadsheet = await this.sheets.spreadsheets.create({
            requestBody: {
              properties: {
                title: newFileName,
              },
            },
          });

          newSheetId = newSpreadsheet.data.spreadsheetId!;
          console.log('✅ New spreadsheet created:', { newSheetId, newFileName });

        } catch (createError: any) {
          console.error('❌ Spreadsheet creation failed:', {
            error: createError.message,
            code: createError.code,
            status: createError.status
          });

          if (createError.code === 403) {
            throw new GoogleSheetsError(
              'スプレッドシートの作成権限がありません。サービスアカウントはストレージクォータ=0のため、OAuth 2.0認証の使用を推奨します。',
              createError,
              GoogleSheetsErrorCode.PERMISSION_DENIED
            );
          }

          throw createError;
        }

        // データを更新
        try {
          await this.updateInvoiceSheet(newSheetId, data);
          console.log('✅ Invoice sheet data updated successfully');
        } catch (updateError: any) {
          console.error('❌ Invoice sheet data update failed:', updateError);
          throw new GoogleSheetsError(
            'Google Sheetsは作成されましたが、データの更新に失敗しました。手動でデータを入力してください。',
            updateError,
            GoogleSheetsErrorCode.UNKNOWN_ERROR
          );
        }
      }

      const url = `https://docs.google.com/spreadsheets/d/${newSheetId}`;
      console.log('🎉 Invoice sheet creation completed:', { sheetId: newSheetId, url });

      return { sheetId: newSheetId, url };
    } catch (error) {
      console.error('❌ Error in createInvoiceSheet:', error);

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

    const updates: Array<{ range: string; values: any[][] }> = [
      // 基本情報（行3-6）
      { range: 'B3', values: [[data.delivery_number]] },
      { range: 'B4', values: [[data.delivery_date]] },
      { range: 'B5', values: [[data.customer_name]] },
      { range: 'B6', values: [[data.customer_address || '']] },
    ];

    // 商品明細（行11から開始、テンプレートは5列: A=商品名, B=数量, C=単価, D=税率, E=金額）
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `A${row}`, values: [[item.product_name]] },
        { range: `B${row}`, values: [[item.quantity + (item.unit || '')]] }, // 数量 + 単位
        { range: `C${row}`, values: [[item.unit_price]] },
        { range: `D${row}`, values: [[`${item.tax_rate}%`]] }, // 税率
        { range: `E${row}`, values: [[item.amount]] } // 税込金額
      );
    });

    // 税率別集計（商品明細の下に配置）
    // 商品明細の最終行 + 2行後から開始
    const summaryStartRow = itemsStartRow + data.items.length + 2;

    // 8%と10%の両方がある場合のみ詳細表示
    const has8Percent = data.subtotal_8 > 0;
    const has10Percent = data.subtotal_10 > 0;

    let summaryRow = summaryStartRow;

    if (has8Percent) {
      updates.push(
        { range: `D${summaryRow}`, values: [['8%対象額']] },
        { range: `E${summaryRow}`, values: [[data.subtotal_8]] }
      );
      summaryRow++;
      updates.push(
        { range: `D${summaryRow}`, values: [['8%消費税']] },
        { range: `E${summaryRow}`, values: [[data.tax_8]] }
      );
      summaryRow++;
    }

    if (has10Percent) {
      updates.push(
        { range: `D${summaryRow}`, values: [['10%対象額']] },
        { range: `E${summaryRow}`, values: [[data.subtotal_10]] }
      );
      summaryRow++;
      updates.push(
        { range: `D${summaryRow}`, values: [['10%消費税']] },
        { range: `E${summaryRow}`, values: [[data.tax_10]] }
      );
      summaryRow++;
    }

    // 空行を1つ追加
    summaryRow++;

    // 小計（税抜）
    const subtotalBeforeTax = data.subtotal_8 + data.subtotal_10;
    updates.push(
      { range: `D${summaryRow}`, values: [['小計（税抜）']] },
      { range: `E${summaryRow}`, values: [[subtotalBeforeTax]] }
    );
    summaryRow++;

    // 消費税合計
    updates.push(
      { range: `D${summaryRow}`, values: [['消費税']] },
      { range: `E${summaryRow}`, values: [[data.total_tax]] }
    );
    summaryRow++;

    // 合計（税込）
    updates.push(
      { range: `D${summaryRow}`, values: [['合計（税込）']] },
      { range: `E${summaryRow}`, values: [[data.total_amount]] }
    );

    // 備考（集計の下 + 2行、A列に配置）
    const notesRow = summaryRow + 2;
    if (data.notes) {
      updates.push({ range: `A${notesRow}`, values: [['備考:']] });
      updates.push({ range: `B${notesRow}`, values: [[data.notes]] });
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

  // ========================================
  // 新しい9列構造テンプレート用のメソッド（V2）
  // ========================================

  /**
   * 新しい9列構造の納品書テンプレートを使用してシートを作成
   */
  async createDeliverySheetV2(data: DeliveryDataV2, templateFileId: string): Promise<{ sheetId: string; url: string }> {
    try {
      console.log('🔍 createDeliverySheetV2 called with:', {
        templateFileId,
        authType: this.authType,
      });

      this.validateDeliveryDataV2(data);

      console.log(`📊 Creating delivery sheet V2 from template (${this.authType}):`, templateFileId);

      const newFileName = `納品書_${data.delivery_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;
      let newFileId: string;

      // OAuth 2.0認証でテンプレートをコピー
      if (this.authType === 'oauth2') {
        console.log('📋 Using OAuth2 - copying template file');

        const drive = google.drive({ version: 'v3', auth: this.auth });

        const copiedFile = await drive.files.copy({
          fileId: templateFileId,
          requestBody: {
            name: newFileName,
          },
        });

        newFileId = copiedFile.data.id!;
        console.log('✅ Template copied successfully:', { newFileId, newFileName });

        // コピーしたファイルにデータを更新
        await this.updateDeliverySheetV2(newFileId, data);
        console.log('✅ Sheet data updated successfully');
      } else {
        throw new GoogleSheetsError(
          '新しいテンプレート（V2）はOAuth 2.0認証が必要です',
          undefined,
          GoogleSheetsErrorCode.AUTHENTICATION_FAILED
        );
      }

      const url = `https://docs.google.com/spreadsheets/d/${newFileId}`;
      console.log('🎉 Delivery sheet V2 creation completed:', { sheetId: newFileId, url });

      return { sheetId: newFileId, url };
    } catch (error) {
      console.error('❌ Error in createDeliverySheetV2:', error);

      if (error instanceof GoogleSheetsError) {
        throw error;
      }

      this.handleGoogleAPIError(error, 'createDeliverySheetV2');
    }
  }

  private validateDeliveryDataV2(data: DeliveryDataV2): void {
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

  /**
   * 新しい9列構造の納品書テンプレートにデータを投入
   */
  private async updateDeliverySheetV2(spreadsheetId: string, data: DeliveryDataV2) {
    console.log('📊 Updating delivery sheet V2:', { spreadsheetId });

    const updates: Array<{ range: string; values: any[][] }> = [];

    // ヘッダー情報（7-8行目）
    updates.push(
      { range: '納品書テンプレート!F7', values: [[`${data.customer_name} 御中`]] },
      { range: '納品書テンプレート!F8', values: [[`納品日: ${data.delivery_date}`]] },
      { range: '納品書テンプレート!H8', values: [[`納品書番号: ${data.delivery_number}`]] }
    );

    // 明細データ（11行目から開始、9列構造）
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `納品書テンプレート!A${row}`, values: [[item.date]] },           // 日付
        { range: `納品書テンプレート!B${row}`, values: [[item.product_name]] },   // 品名
        { range: `納品書テンプレート!C${row}`, values: [[item.unit_price]] },     // 単価
        { range: `納品書テンプレート!D${row}`, values: [[item.quantity]] },       // 数量
        { range: `納品書テンプレート!E${row}`, values: [[item.unit]] },           // 単位
        { range: `納品書テンプレート!F${row}`, values: [[item.tax_rate]] },       // 税率
        // G列（税抜金額）とH列（消費税）はスプレッドシートの数式で自動計算
        { range: `納品書テンプレート!I${row}`, values: [[item.notes || '']] }     // 備考
      );
    });

    console.log('📊 Batch update ranges V2:', updates.map(u => u.range));

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',  // 数式を解釈させるため
        data: updates
      }
    });

    console.log('✅ Delivery sheet V2 updated successfully');
  }

  /**
   * 新しい9列構造の請求書テンプレートを使用してシートを作成
   */
  async createInvoiceSheetV2(data: InvoiceDataV2, templateFileId: string): Promise<{ sheetId: string; url: string }> {
    try {
      console.log('🔍 createInvoiceSheetV2 called with:', {
        templateFileId,
        authType: this.authType,
      });

      this.validateInvoiceDataV2(data);

      console.log(`📊 Creating invoice sheet V2 from template (${this.authType}):`, templateFileId);

      const newFileName = `請求書_${data.invoice_number}_${data.customer_name}_${new Date().toISOString().slice(0, 10)}`;
      let newFileId: string;

      // OAuth 2.0認証でテンプレートをコピー
      if (this.authType === 'oauth2') {
        console.log('📋 Using OAuth2 - copying template file');

        const drive = google.drive({ version: 'v3', auth: this.auth });

        const copiedFile = await drive.files.copy({
          fileId: templateFileId,
          requestBody: {
            name: newFileName,
          },
        });

        newFileId = copiedFile.data.id!;
        console.log('✅ Template copied successfully:', { newFileId, newFileName });

        // コピーしたファイルにデータを更新
        await this.updateInvoiceSheetV2(newFileId, data);
        console.log('✅ Invoice sheet V2 data updated successfully');
      } else {
        throw new GoogleSheetsError(
          '新しいテンプレート（V2）はOAuth 2.0認証が必要です',
          undefined,
          GoogleSheetsErrorCode.AUTHENTICATION_FAILED
        );
      }

      const url = `https://docs.google.com/spreadsheets/d/${newFileId}`;
      console.log('🎉 Invoice sheet V2 creation completed:', { sheetId: newFileId, url });

      return { sheetId: newFileId, url };
    } catch (error) {
      console.error('❌ Error in createInvoiceSheetV2:', error);

      if (error instanceof GoogleSheetsError) {
        throw error;
      }

      this.handleGoogleAPIError(error, 'createInvoiceSheetV2');
    }
  }

  private validateInvoiceDataV2(data: InvoiceDataV2): void {
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

  /**
   * 新しい9列構造の請求書テンプレートにデータを投入
   */
  private async updateInvoiceSheetV2(spreadsheetId: string, data: InvoiceDataV2) {
    console.log('📊 Updating invoice sheet V2:', { spreadsheetId });

    const updates: Array<{ range: string; values: any[][] }> = [];

    // ヘッダー情報（7-8行目）
    updates.push(
      { range: '請求書テンプレート!F7', values: [[`${data.customer_name} 御中`]] },
      { range: '請求書テンプレート!F8', values: [[`請求日: ${data.invoice_date}`]] },
      { range: '請求書テンプレート!H8', values: [[`請求番号: ${data.invoice_number}`]] }
    );

    // 明細データ（11行目から開始、9列構造）
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `請求書テンプレート!A${row}`, values: [[item.date]] },           // 日付
        { range: `請求書テンプレート!B${row}`, values: [[item.product_name]] },   // 品名
        { range: `請求書テンプレート!C${row}`, values: [[item.unit_price]] },     // 単価
        { range: `請求書テンプレート!D${row}`, values: [[item.quantity]] },       // 数量
        { range: `請求書テンプレート!E${row}`, values: [[item.unit]] },           // 単位
        { range: `請求書テンプレート!F${row}`, values: [[item.tax_rate]] },       // 税率
        // G列（税抜金額）とH列（消費税）はスプレッドシートの数式で自動計算
        { range: `請求書テンプレート!I${row}`, values: [[item.notes || '']] }     // 備考
      );
    });

    console.log('📊 Batch update ranges V2:', updates.map(u => u.range));

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',  // 数式を解釈させるため
        data: updates
      }
    });

    console.log('✅ Invoice sheet V2 updated successfully');
  }
}

// シングルトンインスタンス
let googleSheetsClient: GoogleSheetsClient | null = null;

export function getGoogleSheetsClient(): GoogleSheetsClient {
  console.log('🔧 getGoogleSheetsClient called - checking singleton instance');

  if (!googleSheetsClient) {
    console.log('🔧 Creating new GoogleSheetsClient instance');

    const config: GoogleSheetsConfig = {
      // OAuth 2.0認証情報（優先）
      oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      oauthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      // サービスアカウント認証情報（フォールバック）
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      projectId: process.env.GOOGLE_SHEETS_PROJECT_ID,
    };

    const hasOAuth = !!(config.oauthClientId && config.oauthClientSecret && config.oauthRefreshToken);
    const hasServiceAccount = !!(config.clientEmail && config.privateKey && config.projectId);

    console.log('🔧 Environment config check:', {
      hasOAuth,
      hasServiceAccount,
      oauthClientIdLength: config.oauthClientId?.length || 0,
      oauthClientSecretLength: config.oauthClientSecret?.length || 0,
      oauthRefreshTokenLength: config.oauthRefreshToken?.length || 0,
      clientEmailLength: config.clientEmail?.length || 0,
      privateKeyLength: config.privateKey?.length || 0,
      projectIdLength: config.projectId?.length || 0,
      privateKeyFormat: config.privateKey?.includes('-----BEGIN PRIVATE KEY-----'),
    });

    if (!hasOAuth && !hasServiceAccount) {
      console.error('❌ Missing Google Sheets authentication credentials');
      console.error('');
      console.error('OAuth 2.0認証 (推奨) に必要な環境変数:');
      console.error('  - GOOGLE_OAUTH_CLIENT_ID');
      console.error('  - GOOGLE_OAUTH_CLIENT_SECRET');
      console.error('  - GOOGLE_OAUTH_REFRESH_TOKEN');
      console.error('');
      console.error('またはサービスアカウント認証に必要な環境変数:');
      console.error('  - GOOGLE_SHEETS_CLIENT_EMAIL');
      console.error('  - GOOGLE_SHEETS_PRIVATE_KEY');
      console.error('  - GOOGLE_SHEETS_PROJECT_ID');
      console.error('');
      console.error('詳細は OAUTH_SETUP_GUIDE.md を参照してください。');

      throw new GoogleSheetsError(
        'Google Sheets認証情報が設定されていません。環境変数を確認してください。',
        undefined,
        GoogleSheetsErrorCode.AUTHENTICATION_FAILED
      );
    }

    if (hasOAuth) {
      console.log('✅ OAuth 2.0認証情報が見つかりました（優先使用）');
    } else {
      console.log('⚠️  サービスアカウント認証を使用します（ストレージクォータ制限あり）');
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

export type { DeliveryData, InvoiceData, DeliveryDataV2, InvoiceDataV2 };
export { GoogleSheetsError, GoogleSheetsErrorCode };