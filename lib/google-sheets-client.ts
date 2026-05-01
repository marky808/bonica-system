import { google } from 'googleapis';
import { JWT, OAuth2Client } from 'google-auth-library';

/**
 * 数量をフォーマット: 整数なら文字列、小数なら数値として返す
 * 例: 3.0 → "3", 3.5 → 3.5, 20.0 → "20"
 * Google Sheets APIに渡す際に「20.」のようにドットが付かないよう、
 * 整数の場合は文字列として返す（Google Sheetsは自動的に数値として認識する）
 */
function formatQuantity(quantity: number): string | number {
  // 小数点以下が0の場合（20.0など）は文字列として返す
  if (quantity % 1 === 0) {
    return String(Math.trunc(quantity));
  }
  // 小数点以下がある場合（3.5など）はそのまま数値で返す
  return quantity;
}

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
  // 合計金額（オプション - 設定されている場合のみスプレッドシートに書き込み）
  total_amount?: number;       // 合計金額（税込）
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
  billing_period_year?: number;   // 請求対象年
  billing_period_month?: number;  // 請求対象月
  items: {
    date?: string;              // 日付 (YYYY-MM-DD形式)
    delivery_destination?: string; // 納品先名
    description: string;        // 商品名
    quantity: number;
    unit?: string;              // 単位
    unit_price: number;
    tax_rate?: number;
    subtotal?: number;          // 税抜金額
    tax_amount?: number;        // 消費税額
    amount: number;             // 税込金額
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

// 新しい10列構造のテンプレート用（請求書テンプレート）
interface InvoiceDataV2 {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_address?: string;
  items: {
    date: string;                    // A列: 日付 (MM/DD形式)
    delivery_destination?: string;   // B列: 納品先
    product_name: string;            // C列: 品名
    unit_price: number;              // D列: 単価
    quantity: number;                // E列: 数量
    unit: string;                    // F列: 単位 (kg, 袋, 箱など)
    tax_rate: string;                // G列: 税率 ("8%" or "10%")
    // H列: 税抜金額 (スプレッドシートで自動計算: =D*E)
    // I列: 消費税 (スプレッドシートで自動計算: =H*税率)
    notes?: string;                  // J列: 備考
  }[];
  // 税率別集計・合計（オプション - 設定されている場合のみスプレッドシートに書き込み）
  subtotal_8?: number;               // C53: 8%対象
  tax_8?: number;                    // C54: 消費税8%
  subtotal_10?: number;              // C55: 10%対象
  tax_10?: number;                   // C56: 消費税10%
  subtotal?: number;                 // H58: 小計
  total_tax?: number;                // H59: 消費税
  total_amount?: number;             // H60: 合計, C7:D7: ご請求金額
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

      // 共有設定を有効化（誰でも閲覧可能に）
      try {
        await this.shareSheet(newFileId);
        console.log('✅ Sheet sharing enabled (anyone with link can view)');
      } catch (shareError: any) {
        console.warn('⚠️ Failed to enable sharing, but sheet was created:', shareError.message);
        // 共有設定の失敗は致命的ではないので続行
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

        // シート名を変更（請求先名_YYYY年MM月）
        try {
          const year = data.billing_period_year || new Date().getFullYear();
          const month = data.billing_period_month || (new Date().getMonth() + 1);
          const sheetName = `${data.customer_name}_${year}年${month}月`;
          console.log('📝 Renaming invoice sheet to:', sheetName);

          // Get the first sheet ID
          const spreadsheet = await this.sheets.spreadsheets.get({
            spreadsheetId: newSheetId,
          });

          const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId;

          if (firstSheetId !== undefined) {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: newSheetId,
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
            console.log('✅ Invoice sheet renamed successfully:', sheetName);
          } else {
            console.warn('⚠️ Could not find sheet ID for renaming');
          }
        } catch (renameError: any) {
          console.error('❌ Invoice sheet rename failed (non-critical):', renameError);
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

      // 共有設定を有効化（誰でも閲覧可能に）
      try {
        await this.shareSheet(newSheetId);
        console.log('✅ Sheet sharing enabled (anyone with link can view)');
      } catch (shareError: any) {
        console.warn('⚠️ Failed to enable sharing, but sheet was created:', shareError.message);
        // 共有設定の失敗は致命的ではないので続行
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
        { range: `B${row}`, values: [[formatQuantity(item.quantity) + (item.unit || '')]] }, // 数量 + 単位（整数なら小数点なし）
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
    console.log('📊 Updating invoice sheet with data:', {
      customer_name: data.customer_name,
      invoice_number: data.invoice_number,
      items_count: data.items.length,
      subtotal_8: data.subtotal_8,
      tax_8: data.tax_8,
      subtotal_10: data.subtotal_10,
      tax_10: data.tax_10,
      total_amount: data.total_amount
    });

    // まずプレースホルダーを置換
    try {
      // シートIDを取得
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

      // プレースホルダー置換リクエスト
      const findReplaceRequests = [
        {
          findReplace: {
            find: '{{deliveryDate}}',
            replacement: data.invoice_date,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{deliveryNumber}}',
            replacement: data.invoice_number,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerName}}',
            replacement: `${data.customer_name} 御中`,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerAddress}}',
            replacement: data.billing_address || data.customer_address || '',
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: findReplaceRequests
        }
      });
      console.log('✅ Placeholders replaced successfully');
    } catch (placeholderError: any) {
      console.error('⚠️ Placeholder replacement failed (non-critical):', placeholderError.message);
      // プレースホルダー置換が失敗しても続行
    }

    // セル値の更新
    const updates: Array<{ range: string; values: any[][] }> = [];

    // 基本情報（プレースホルダーがない場合のフォールバック）
    // A2: 顧客名, A3: 顧客住所
    updates.push(
      { range: 'A2', values: [[`${data.customer_name} 御中`]] },
      { range: 'A3', values: [[data.billing_address || data.customer_address || '']] },
    );

    // 商品明細（10行目から開始、9行目はヘッダー）
    // テンプレート列構成: A:日付, B:納品先, C:品名, D:単価, E:数量, F:単位, G:税率, H:税抜金額, I:消費税, J:備考
    const itemsStartRow = 10;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      // 日付をMM/DD形式に変換（YYYY-MM-DD形式から）
      const dateFormatted = item.date ? `${item.date.slice(5, 7)}/${item.date.slice(8, 10)}` : '';

      updates.push(
        { range: `A${row}`, values: [[dateFormatted]] },
        { range: `B${row}`, values: [[item.delivery_destination || '']] },
        { range: `C${row}`, values: [[item.description]] },
        { range: `D${row}`, values: [[item.unit_price]] },
        { range: `E${row}`, values: [[formatQuantity(item.quantity)]] },  // 数量（整数なら小数点なし）
        { range: `F${row}`, values: [[item.unit || '']] },
        { range: `G${row}`, values: [[`${item.tax_rate || 8}%`]] },
        { range: `H${row}`, values: [[item.subtotal || (item.unit_price * item.quantity)]] },
        { range: `I${row}`, values: [[item.tax_amount || 0]] },
        { range: `J${row}`, values: [['']] }  // 備考は空欄
      );
    });

    // 税率別集計（テンプレートの集計エリア: 行53-60）
    // 行53: 8%対象（C列に金額）
    // 行54: 消費税8%（C列に金額）
    // 行55: 10%対象（C列に金額）
    // 行56: 消費税10%（C列に金額）
    // 行58: 小計（H列に金額）
    // 行59: 消費税（H列に金額）
    // 行60: 合計（H列に金額）
    updates.push(
      // 8%対象
      { range: 'C53', values: [[data.subtotal_8 || 0]] },
      { range: 'C54', values: [[data.tax_8 || 0]] },
      // 10%対象
      { range: 'C55', values: [[data.subtotal_10 || 0]] },
      { range: 'C56', values: [[data.tax_10 || 0]] },
      // 小計・消費税・合計
      { range: 'H58', values: [[data.subtotal]] },
      { range: 'H59', values: [[data.total_tax]] },
      { range: 'H60', values: [[data.total_amount]] }
    );

    // 行40-42への書き込みも維持（テンプレートによってはここも使う）
    updates.push(
      { range: 'A40', values: [['8%対象']] },
      { range: 'H40', values: [[data.subtotal_8 || 0]] },
      { range: 'I40', values: [[data.tax_8 || 0]] },
      { range: 'A41', values: [['10%対象']] },
      { range: 'H41', values: [[data.subtotal_10 || 0]] },
      { range: 'I41', values: [[data.tax_10 || 0]] },
      { range: 'A42', values: [['合計']] },
      { range: 'H42', values: [[data.subtotal]] },
      { range: 'I42', values: [[data.total_tax]] }
    );

    // 備考（集計の下に配置）
    if (data.notes) {
      updates.push({ range: 'A44', values: [[data.notes]] });
    }

    console.log('📊 Batch update ranges:', updates.map(u => u.range));

    // 一括更新（USER_ENTEREDで文字化けを防止）
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    console.log('✅ Invoice sheet updated successfully');
  }

  async shareSheet(sheetId: string, emails: string[] = []): Promise<void> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });

      // リンクを知っている全員が編集可能に設定
      await drive.permissions.create({
        fileId: sheetId,
        requestBody: {
          role: 'writer',  // 編集権限
          type: 'anyone'
        }
      });
      console.log('✅ Sheet shared: anyone with link can edit');

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

        // 共有設定を有効化（誰でも編集可能に）
        try {
          await this.shareSheet(newFileId);
        } catch (shareError: any) {
          console.warn('⚠️ Failed to enable sharing, but sheet was created:', shareError.message);
        }
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
   * レイアウト: 左側=顧客情報、右側=発行元（ボニカ）
   * 列構成: A:日付, B:品名, C:単価, D:数量, E:単位, F:税率, G:税抜金額(自動), H:消費税(自動), I:備考
   */
  private async updateDeliverySheetV2(spreadsheetId: string, data: DeliveryDataV2) {
    console.log('📊 Updating delivery sheet V2:', { spreadsheetId });

    const updates: Array<{ range: string; values: any[][] }> = [];

    // 顧客情報（2-4行目、左側）- シート名プレフィックスなし（請求書と同じ方式）
    updates.push(
      { range: 'A2', values: [[`${data.customer_name} 御中`]] },
      { range: 'A3', values: [[data.customer_address || '']] },
      { range: 'A4', values: [[`納品日: ${data.delivery_date}`]] },
      { range: 'C4', values: [[`納品書番号: ${data.delivery_number}`]] }
    );

    // 合計金額は明細下部の合計行（F-I列）にのみ表示する。
    // 上部 A7:B7 への重複書き込みは廃止（顧客視点での二重表示を回避）。

    // 明細データ（11行目から開始、9列構造）
    // A:日付, B:品名, C:単価, D:数量, E:単位, F:税率, G:税抜金額, H:消費税, I:備考
    const itemsStartRow = 11;
    let totalSubtotal = 0;
    let totalTax = 0;

    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      // 税抜金額と消費税を計算
      const subtotal = item.unit_price * item.quantity;
      // 税率を文字列から数値に変換（"8%" -> 0.08, "10%" -> 0.10）
      const taxRateNum = parseInt(item.tax_rate.replace('%', ''), 10) / 100;
      const taxAmount = Math.floor(subtotal * taxRateNum);

      // 合計用に累積
      totalSubtotal += subtotal;
      totalTax += taxAmount;

      updates.push(
        { range: `A${row}`, values: [[item.date]] },                          // A列: 日付
        { range: `B${row}`, values: [[item.product_name]] },                  // B列: 品名
        { range: `C${row}`, values: [[item.unit_price]] },                    // C列: 単価
        { range: `D${row}`, values: [[formatQuantity(item.quantity)]] },      // D列: 数量（整数なら小数点なし）
        { range: `E${row}`, values: [[item.unit]] },                          // E列: 単位
        { range: `F${row}`, values: [[item.tax_rate]] },                      // F列: 税率
        { range: `G${row}`, values: [[subtotal]] },                           // G列: 税抜金額
        { range: `H${row}`, values: [[taxAmount]] },                          // H列: 消費税
        { range: `I${row}`, values: [[item.notes || '']] }                    // I列: 備考
      );
    });

    // 明細下部に合計行を追加（明細終了行 + 2行）
    const summaryRow = itemsStartRow + data.items.length + 1;
    const grandTotal = totalSubtotal + totalTax;
    updates.push(
      { range: `F${summaryRow}`, values: [['合計']] },
      { range: `G${summaryRow}`, values: [[totalSubtotal]] },
      { range: `H${summaryRow}`, values: [[totalTax]] },
      { range: `I${summaryRow}`, values: [[`¥${grandTotal.toLocaleString()}`]] }
    );
    console.log(`📊 Delivery summary row at ${summaryRow}: subtotal=${totalSubtotal}, tax=${totalTax}, total=${grandTotal}`);

    console.log('📊 Batch update ranges V2:', updates.map(u => u.range));

    // シートIDを取得（フォーマット設定に必要）
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;
    console.log('📊 Sheet ID for formatting:', firstSheetId);

    // D列のフォーマットをクリアしてから値を書き込む
    // テンプレートの「20.」フォーマット問題を回避
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: firstSheetId,
                  startRowIndex: 10,
                  endRowIndex: 10 + data.items.length,
                  startColumnIndex: 3,  // D列
                  endColumnIndex: 4
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'TEXT'  // テキスト形式に設定して数値フォーマットをクリア
                    }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            }
          ]
        }
      });
      console.log('✅ D column format cleared to TEXT');
    } catch (clearError: any) {
      console.warn('⚠️ Failed to clear D column format:', clearError.message);
    }

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',  // 数式を解釈させるため
        data: updates
      }
    });

    // 書式設定（明細下部の合計行 + 明細行枠線・アラインメント）
    try {
      const formatRequests = [
        // 明細下部の合計行（F-I列）のフォーマット
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: summaryRow - 1,  // 0-indexed
              endRowIndex: summaryRow,
              startColumnIndex: 5,  // F列
              endColumnIndex: 9     // I列まで
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true
                },
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        },
        // 明細下部の合計行に上枠線を追加
        {
          updateBorders: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: summaryRow - 1,
              endRowIndex: summaryRow,
              startColumnIndex: 5,  // F列
              endColumnIndex: 9     // I列
            },
            top: { style: 'SOLID', width: 2, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // ========================================
        // 明細行（11行目〜）に枠線を適用
        // テンプレートの枠線範囲外の明細行にも枠線を付ける
        // ========================================
        {
          updateBorders: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,  // 11行目（0-indexed で 10）
              endRowIndex: itemsStartRow - 1 + data.items.length,  // 明細最終行まで
              startColumnIndex: 0,  // A列
              endColumnIndex: 9     // I列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // ========================================
        // 明細行のアラインメントと数値フォーマットを設定
        // ========================================
        // A列（日付）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 0,  // A列
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // B列（品名）: 左寄せ
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 1,  // B列
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // C列（単価）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 2,  // C列
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // D列（数量）: 右寄せ + 数値フォーマット
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 3,  // D列
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0.###'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // E列（単位）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 4,  // E列
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // F列（税率）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 5,  // F列
              endColumnIndex: 6
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // G列（税抜金額）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 6,  // G列
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // H列（消費税）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 7,  // H列
              endColumnIndex: 8
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // I列（備考）: 左寄せ
        {
          repeatCell: {
            range: {
              sheetId: firstSheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 8,  // I列
              endColumnIndex: 9
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: formatRequests
        }
      });
      console.log('✅ Formatting applied successfully (including detail row borders and alignment)');
    } catch (formatError: any) {
      console.warn('⚠️ Formatting failed (non-critical):', formatError.message);
    }

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

        // 共有設定を有効化（誰でも編集可能に）
        try {
          await this.shareSheet(newFileId);
        } catch (shareError: any) {
          console.warn('⚠️ Failed to enable sharing, but sheet was created:', shareError.message);
        }
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

  // ========================================
  // 月別スプレッドシート管理メソッド
  // ========================================

  /**
   * 月別請求書スプレッドシートを取得または作成し、請求書タブを追加
   * @param data 請求書データ
   * @param templateFileId テンプレートファイルID
   * @param year 対象年
   * @param month 対象月
   * @param customerName 顧客名（タブ名に使用）
   * @returns { spreadsheetId, spreadsheetUrl, sheetId, tabName }
   */
  async createOrAddInvoiceToMonthlySheet(
    data: InvoiceDataV2,
    templateFileId: string,
    year: number,
    month: number,
    customerName: string,
    existingSpreadsheetId?: string
  ): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheetId: number;
    tabName: string;
    isNewSpreadsheet: boolean;
  }> {
    console.log('📊 createOrAddInvoiceToMonthlySheet called:', {
      year, month, customerName, existingSpreadsheetId
    });

    const tabName = `${month}月分_${customerName}`;
    let spreadsheetId: string;
    let isNewSpreadsheet = false;

    if (existingSpreadsheetId) {
      // 既存のスプレッドシートにタブを追加
      spreadsheetId = existingSpreadsheetId;
      console.log('📋 Adding tab to existing spreadsheet:', spreadsheetId);
    } else {
      // 新しいスプレッドシートを作成
      const spreadsheetName = `${year}年${month}月_請求書一覧`;
      spreadsheetId = await this.createMonthlySpreadsheet(spreadsheetName, templateFileId);
      isNewSpreadsheet = true;
      console.log('✅ New monthly spreadsheet created:', spreadsheetId);
    }

    // テンプレートからタブをコピー
    const newSheetId = await this.copySheetFromTemplate(templateFileId, spreadsheetId, tabName);
    console.log('✅ Sheet copied with new tab name:', tabName);

    // コピーしたタブにデータを投入
    await this.updateInvoiceSheetV2WithTabName(spreadsheetId, data, tabName);
    console.log('✅ Invoice data updated on tab:', tabName);

    // 共有設定を有効化（新規作成の場合のみ）
    if (isNewSpreadsheet) {
      try {
        await this.shareSheet(spreadsheetId);
        console.log('✅ Sheet sharing enabled');
      } catch (shareError: any) {
        console.warn('⚠️ Failed to enable sharing:', shareError.message);
      }
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return {
      spreadsheetId,
      spreadsheetUrl,
      sheetId: newSheetId,
      tabName,
      isNewSpreadsheet
    };
  }

  /**
   * 新しい月別スプレッドシートを作成（テンプレートをコピー）
   */
  private async createMonthlySpreadsheet(name: string, templateFileId: string): Promise<string> {
    console.log('📋 Creating monthly spreadsheet:', name);

    const drive = google.drive({ version: 'v3', auth: this.auth });

    const copiedFile = await drive.files.copy({
      fileId: templateFileId,
      requestBody: {
        name: name,
      },
    });

    const spreadsheetId = copiedFile.data.id!;
    console.log('✅ Monthly spreadsheet created:', spreadsheetId);

    // デフォルトのシート名を一時的な名前に変更（後で上書きされる）
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });

      const firstSheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId;
      if (firstSheetId !== undefined) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: firstSheetId,
                    title: '_テンプレート',
                  },
                  fields: 'title',
                },
              },
            ],
          },
        });
      }
    } catch (renameError: any) {
      console.warn('⚠️ Could not rename default sheet:', renameError.message);
    }

    return spreadsheetId;
  }

  /**
   * テンプレートからシートをコピーして別のスプレッドシートに追加
   */
  private async copySheetFromTemplate(
    templateSpreadsheetId: string,
    destinationSpreadsheetId: string,
    newTabName: string
  ): Promise<number> {
    console.log('📋 Copying sheet from template:', {
      templateSpreadsheetId,
      destinationSpreadsheetId,
      newTabName
    });

    // テンプレートの最初のシートIDを取得
    const templateSpreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: templateSpreadsheetId,
    });

    const sourceSheetId = templateSpreadsheet.data.sheets?.[0]?.properties?.sheetId;
    if (sourceSheetId === undefined) {
      throw new GoogleSheetsError(
        'テンプレートにシートが見つかりません',
        undefined,
        GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
      );
    }

    // シートをコピー
    const copyResponse = await this.sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: templateSpreadsheetId,
      sheetId: sourceSheetId,
      requestBody: {
        destinationSpreadsheetId: destinationSpreadsheetId,
      },
    });

    const newSheetId = copyResponse.data.sheetId!;
    console.log('✅ Sheet copied, new sheetId:', newSheetId);

    // シート名を変更
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: destinationSpreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: newSheetId,
                title: newTabName,
              },
              fields: 'title',
            },
          },
        ],
      },
    });

    console.log('✅ Sheet renamed to:', newTabName);
    return newSheetId;
  }

  /**
   * タブ名を指定して請求書データを投入（月別スプレッドシート用）
   */
  private async updateInvoiceSheetV2WithTabName(
    spreadsheetId: string,
    data: InvoiceDataV2,
    tabName: string
  ) {
    console.log('📊 Updating invoice sheet V2 with tab name:', { spreadsheetId, tabName });

    // シートIDを取得
    const sheetId = await this.getSheetIdByName(spreadsheetId, tabName);

    // プレースホルダーを置換
    try {
      const findReplaceRequests = [
        {
          findReplace: {
            find: '{{deliveryDate}}',
            replacement: data.invoice_date,
            allSheets: false,
            sheetId: sheetId,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{deliveryNumber}}',
            replacement: data.invoice_number,
            allSheets: false,
            sheetId: sheetId,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerName}}',
            replacement: `${data.customer_name} 御中`,
            allSheets: false,
            sheetId: sheetId,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerAddress}}',
            replacement: data.customer_address || '',
            allSheets: false,
            sheetId: sheetId,
            matchCase: false,
            matchEntireCell: false,
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: findReplaceRequests
        }
      });
      console.log('✅ Placeholders replaced successfully');
    } catch (placeholderError: any) {
      console.error('⚠️ Placeholder replacement failed (non-critical):', placeholderError.message);
    }

    // E列（数量）のフォーマットをクリアしてから値を書き込む
    // テンプレートの「20.」フォーマット問題を回避
    const itemsStartRow = 11;
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: itemsStartRow - 1,  // 10 (11行目、0-indexed)
                  endRowIndex: itemsStartRow - 1 + data.items.length,
                  startColumnIndex: 4,  // E列
                  endColumnIndex: 5
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'TEXT'  // テキスト形式に設定して数値フォーマットをクリア
                    }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            }
          ]
        }
      });
      console.log('✅ E column format cleared to TEXT before writing values');
    } catch (clearError: any) {
      console.warn('⚠️ Failed to clear E column format:', clearError.message);
    }

    const updates: Array<{ range: string; values: any[][] }> = [];

    // 顧客情報（2-4行目、左側）
    updates.push(
      { range: `'${tabName}'!A2`, values: [[`${data.customer_name} 御中`]] },
      { range: `'${tabName}'!A3`, values: [[data.customer_address || '']] },
      { range: `'${tabName}'!A4`, values: [[`請求日: ${data.invoice_date}`]] },
      { range: `'${tabName}'!D4`, values: [[`請求書番号: ${data.invoice_number}`]] }
    );

    // 合計金額は明細下部の合計行（G/H列）にのみ表示する。
    // 上部 C7:D7 への重複書き込みは廃止（納品書と同様、顧客視点での二重表示を回避）。

    // 明細データ（11行目から開始、10列構造）
    // H列（税抜金額）とI列（消費税）も計算して書き込む（テンプレート数式に依存しない）
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      // 税抜金額と消費税を計算
      const subtotal = item.unit_price * item.quantity;
      const taxRateNum = parseInt(item.tax_rate.replace('%', ''), 10) / 100;
      const taxAmount = Math.floor(subtotal * taxRateNum);

      updates.push(
        { range: `'${tabName}'!A${row}`, values: [[item.date]] },
        { range: `'${tabName}'!B${row}`, values: [[item.delivery_destination || '']] },
        { range: `'${tabName}'!C${row}`, values: [[item.product_name]] },
        { range: `'${tabName}'!D${row}`, values: [[item.unit_price]] },
        { range: `'${tabName}'!E${row}`, values: [[formatQuantity(item.quantity)]] },
        { range: `'${tabName}'!F${row}`, values: [[item.unit]] },
        { range: `'${tabName}'!G${row}`, values: [[item.tax_rate]] },
        { range: `'${tabName}'!H${row}`, values: [[subtotal]] },        // H列: 税抜金額（計算値）
        { range: `'${tabName}'!I${row}`, values: [[taxAmount]] },       // I列: 消費税（計算値）
        { range: `'${tabName}'!J${row}`, values: [[item.notes || '']] }
      );
    });

    // 集計エリアの位置を動的に計算
    // 明細終了行 + 3行の空白を確保、ただし最小でも53行目から
    const itemsEndRow = itemsStartRow + data.items.length - 1;
    const summaryStartRow = Math.max(itemsEndRow + 3, 53);
    console.log(`📊 Items: ${data.items.length}, End row: ${itemsEndRow}, Summary starts at row: ${summaryStartRow}`);

    // 税率別集計（動的位置）- 設定されている場合
    if (data.subtotal_8 !== undefined) {
      // 税率別集計ヘッダー
      updates.push(
        { range: `'${tabName}'!A${summaryStartRow - 1}`, values: [['【税率別集計】']] }
      );
      // 税率別集計の値
      updates.push(
        { range: `'${tabName}'!C${summaryStartRow}`, values: [[`¥${data.subtotal_8.toLocaleString()}`]] },
        { range: `'${tabName}'!C${summaryStartRow + 1}`, values: [[`¥${data.tax_8?.toLocaleString() || '0'}`]] },
        { range: `'${tabName}'!C${summaryStartRow + 2}`, values: [[`¥${data.subtotal_10?.toLocaleString() || '0'}`]] },
        { range: `'${tabName}'!C${summaryStartRow + 3}`, values: [[`¥${data.tax_10?.toLocaleString() || '0'}`]] }
      );
      // 税率別集計のラベル
      updates.push(
        { range: `'${tabName}'!B${summaryStartRow}`, values: [['8%対象']] },
        { range: `'${tabName}'!B${summaryStartRow + 1}`, values: [['消費税(8%)']] },
        { range: `'${tabName}'!B${summaryStartRow + 2}`, values: [['10%対象']] },
        { range: `'${tabName}'!B${summaryStartRow + 3}`, values: [['消費税(10%)']] }
      );
    }

    // 小計・消費税・合計（動的位置）- 設定されている場合
    const totalStartRow = summaryStartRow + 5;
    if (data.subtotal !== undefined) {
      updates.push(
        { range: `'${tabName}'!G${totalStartRow}`, values: [['小計']] },
        { range: `'${tabName}'!H${totalStartRow}`, values: [[`¥${data.subtotal.toLocaleString()}`]] },
        { range: `'${tabName}'!G${totalStartRow + 1}`, values: [['消費税']] },
        { range: `'${tabName}'!H${totalStartRow + 1}`, values: [[`¥${data.total_tax?.toLocaleString() || '0'}`]] },
        { range: `'${tabName}'!G${totalStartRow + 2}`, values: [['合計']] },
        { range: `'${tabName}'!H${totalStartRow + 2}`, values: [[`¥${data.total_amount?.toLocaleString() || '0'}`]] }
      );
    }

    console.log('📊 Batch update ranges:', updates.length, 'ranges');

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    // 書式設定（合計金額が設定されている場合のみ）
    if (data.total_amount !== undefined) {
      const formatRequests = [
        // ========================================
        // 1. 旧テンプレートの固定集計エリア（52-60行目）の書式をクリア
        // テンプレートのボールド等の書式が残る問題を解決
        // ========================================
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 51,   // 52行目（0-indexed）
              endRowIndex: 60,     // 60行目まで
              startColumnIndex: 0, // A列から
              endColumnIndex: 10   // J列まで
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: false,      // ボールド解除
                  fontSize: 10      // 標準フォントサイズ
                }
              }
            },
            fields: 'userEnteredFormat.textFormat'
          }
        },
        // 明細終了後〜集計開始前のエリアをクリア（旧テンプレートの残骸を削除）
        // 注意: 明細データがある行は消さない
        ...(itemsEndRow < summaryStartRow - 2 ? [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsEndRow,           // 明細最終行の次から
              endRowIndex: summaryStartRow - 2,     // 集計ヘッダーの前まで
              startColumnIndex: 0, // A列から
              endColumnIndex: 10   // J列まで
            },
            cell: {
              userEnteredValue: {
                stringValue: ''
              }
            },
            fields: 'userEnteredValue'
          }
        }] : []),
        // ========================================
        // 2. 明細行（11行目〜itemsEndRow）に枠線を適用
        // テンプレートの枠線範囲外の明細行にも枠線を付ける
        // ========================================
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,  // 11行目（0-indexed で 10）
              endRowIndex: itemsEndRow,           // 明細最終行まで
              startColumnIndex: 0,  // A列
              endColumnIndex: 10    // J列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // ========================================
        // E列（数量）の数値形式を設定 - 整数は小数点なし、小数は表示（明細行）
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,  // 11行目から
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 4,  // E列
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0.###'  // 整数は小数点なし、小数は最大3桁表示
                }
              }
            },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        // ========================================
        // 3. 明細行のアラインメントと数値フォーマットを設定
        // 51行目以降でも正しいフォーマットが適用されるよう全明細行に設定
        // ========================================
        // A列（日付）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 0,  // A列
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // B列（納品先）: 左寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 1,  // B列
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // C列（品名）: 左寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 2,  // C列
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // D列（単価）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 3,  // D列
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // E列（数量）: 右寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 4,  // E列
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // F列（単位）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 5,  // F列
              endColumnIndex: 6
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // G列（税率）: 中央寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 6,  // G列
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // H列（税抜金額）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 7,  // H列
              endColumnIndex: 8
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // I列（消費税）: 右寄せ + 通貨フォーマット
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 8,  // I列
              endColumnIndex: 9
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'RIGHT',
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '¥#,##0'
                }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,numberFormat)'
          }
        },
        // J列（備考）: 左寄せ
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,
              endRowIndex: itemsStartRow - 1 + data.items.length,
              startColumnIndex: 9,  // J列
              endColumnIndex: 10
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
          }
        },
        // 【税率別集計】ヘッダーの枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: summaryStartRow - 2,  // 【税率別集計】行（0-indexed）
              endRowIndex: summaryStartRow - 1,
              startColumnIndex: 0,  // A列
              endColumnIndex: 1
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // 税率別集計エリア（B:C列）の枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: summaryStartRow - 1,  // 8%対象の行から（0-indexed）
              endRowIndex: summaryStartRow + 3,     // 消費税(10%)の行まで
              startColumnIndex: 1,  // B列
              endColumnIndex: 3     // C列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // 小計・消費税・合計エリア（G:H列）の枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: totalStartRow - 1,    // 小計の行から（0-indexed）
              endRowIndex: totalStartRow + 2,       // 合計の行まで
              startColumnIndex: 6,  // G列
              endColumnIndex: 8     // H列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: formatRequests
        }
      });
      console.log('✅ Formatting applied successfully (including dynamic borders)');
    }

    console.log('✅ Invoice sheet V2 with tab name updated successfully');
  }

  /**
   * シート名からシートIDを取得
   */
  private async getSheetIdByName(spreadsheetId: string, sheetName: string): Promise<number> {
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    );

    if (!sheet?.properties?.sheetId) {
      throw new GoogleSheetsError(
        `シート「${sheetName}」が見つかりません`,
        undefined,
        GoogleSheetsErrorCode.TEMPLATE_NOT_FOUND
      );
    }

    return sheet.properties.sheetId;
  }

  /**
   * 新しい10列構造の請求書テンプレートにデータを投入
   * レイアウト: 左側=顧客情報、右側=発行元（ボニカ）
   * 列構成: A:日付, B:納品先, C:品名, D:単価, E:数量, F:単位, G:税率, H:税抜金額, I:消費税, J:備考
   */
  private async updateInvoiceSheetV2(spreadsheetId: string, data: InvoiceDataV2) {
    console.log('📊 Updating invoice sheet V2:', { spreadsheetId });

    // まずプレースホルダーを置換
    try {
      const findReplaceRequests = [
        {
          findReplace: {
            find: '{{deliveryDate}}',
            replacement: data.invoice_date,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{deliveryNumber}}',
            replacement: data.invoice_number,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerName}}',
            replacement: `${data.customer_name} 御中`,
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        },
        {
          findReplace: {
            find: '{{customerAddress}}',
            replacement: data.customer_address || '',
            allSheets: true,
            matchCase: false,
            matchEntireCell: false,
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: findReplaceRequests
        }
      });
      console.log('✅ Placeholders replaced successfully');
    } catch (placeholderError: any) {
      console.error('⚠️ Placeholder replacement failed (non-critical):', placeholderError.message);
      // プレースホルダー置換が失敗しても続行
    }

    const updates: Array<{ range: string; values: any[][] }> = [];

    // 顧客情報（2-4行目、左側）- プレースホルダー置換のフォールバック
    // シート名プレフィックスを使用しない（コピー後のシート名が異なる場合に対応）
    updates.push(
      { range: 'A2', values: [[`${data.customer_name} 御中`]] },
      { range: 'A3', values: [[data.customer_address || '']] },
      { range: 'A4', values: [[`請求日: ${data.invoice_date}`]] },
      { range: 'D4', values: [[`請求書番号: ${data.invoice_number}`]] }
    );

    // 明細データ（11行目から開始、10列構造）
    // A:日付, B:納品先, C:品名, D:単価, E:数量, F:単位, G:税率, H:税抜金額(自動), I:消費税(自動), J:備考
    const itemsStartRow = 11;
    data.items.forEach((item, index) => {
      const row = itemsStartRow + index;
      updates.push(
        { range: `A${row}`, values: [[item.date]] },                          // 日付
        { range: `B${row}`, values: [[item.delivery_destination || '']] },    // 納品先
        { range: `C${row}`, values: [[item.product_name]] },                  // 品名
        { range: `D${row}`, values: [[item.unit_price]] },                    // 単価
        { range: `E${row}`, values: [[formatQuantity(item.quantity)]] },      // 数量（整数なら小数点なし）
        { range: `F${row}`, values: [[item.unit]] },                          // 単位
        { range: `G${row}`, values: [[item.tax_rate]] },                      // 税率
        // H列（税抜金額）とI列（消費税）はスプレッドシートの数式で自動計算
        { range: `J${row}`, values: [[item.notes || '']] }                    // 備考
      );
    });

    // 集計エリアの位置を動的に計算
    // 明細終了行 + 3行の空白を確保、ただし最小でも53行目から
    const itemsEndRow = itemsStartRow + data.items.length - 1;
    const summaryStartRow = Math.max(itemsEndRow + 3, 53);
    console.log(`📊 Items: ${data.items.length}, End row: ${itemsEndRow}, Summary starts at row: ${summaryStartRow}`);

    // 税率別集計（動的位置）- 設定されている場合
    if (data.subtotal_8 !== undefined) {
      // 【税率別集計】ヘッダー
      updates.push(
        { range: `A${summaryStartRow - 1}`, values: [['【税率別集計】']] }
      );
      updates.push(
        { range: `C${summaryStartRow}`, values: [[`¥${data.subtotal_8.toLocaleString()}`]] },
        { range: `C${summaryStartRow + 1}`, values: [[`¥${data.tax_8?.toLocaleString() || '0'}`]] },
        { range: `C${summaryStartRow + 2}`, values: [[`¥${data.subtotal_10?.toLocaleString() || '0'}`]] },
        { range: `C${summaryStartRow + 3}`, values: [[`¥${data.tax_10?.toLocaleString() || '0'}`]] }
      );
      // 税率別集計のラベルも追加（テンプレートにない場合に備えて）
      updates.push(
        { range: `B${summaryStartRow}`, values: [['8%対象']] },
        { range: `B${summaryStartRow + 1}`, values: [['消費税(8%)']] },
        { range: `B${summaryStartRow + 2}`, values: [['10%対象']] },
        { range: `B${summaryStartRow + 3}`, values: [['消費税(10%)']] }
      );
    }

    // 小計・消費税・合計（動的位置）- 設定されている場合
    const totalStartRow = summaryStartRow + 5;
    if (data.subtotal !== undefined) {
      updates.push(
        { range: `G${totalStartRow}`, values: [['小計']] },
        { range: `H${totalStartRow}`, values: [[`¥${data.subtotal.toLocaleString()}`]] },
        { range: `G${totalStartRow + 1}`, values: [['消費税']] },
        { range: `H${totalStartRow + 1}`, values: [[`¥${data.total_tax?.toLocaleString() || '0'}`]] },
        { range: `G${totalStartRow + 2}`, values: [['合計']] },
        { range: `H${totalStartRow + 2}`, values: [[`¥${data.total_amount?.toLocaleString() || '0'}`]] }
      );
    }

    console.log('📊 Batch update ranges V2:', updates.map(u => u.range));

    // 一括更新
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',  // 数式を解釈させるため
        data: updates
      }
    });

    // 枠線のフォーマットを適用（動的位置の集計エリア）
    if (data.subtotal_8 !== undefined) {
      // シートID取得（最初のシート）
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });
      const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

      const borderRequests = [
        // ========================================
        // 1. 旧テンプレートの固定集計エリア（52-60行目）の書式をクリア
        // テンプレートのボールド等の書式が残る問題を解決
        // ========================================
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 51,   // 52行目（0-indexed）
              endRowIndex: 60,     // 60行目まで
              startColumnIndex: 0, // A列から
              endColumnIndex: 10   // J列まで
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: false,      // ボールド解除
                  fontSize: 10      // 標準フォントサイズ
                }
              }
            },
            fields: 'userEnteredFormat.textFormat'
          }
        },
        // 明細終了後〜集計開始前のエリアをクリア（旧テンプレートの残骸を削除）
        // 注意: 明細データがある行は消さない
        ...(itemsEndRow < summaryStartRow - 2 ? [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsEndRow,           // 明細最終行の次から
              endRowIndex: summaryStartRow - 2,     // 集計ヘッダーの前まで
              startColumnIndex: 0, // A列から
              endColumnIndex: 10   // J列まで
            },
            cell: {
              userEnteredValue: {
                stringValue: ''
              }
            },
            fields: 'userEnteredValue'
          }
        }] : []),
        // ========================================
        // 2. 明細行（11行目〜itemsEndRow）に枠線を適用
        // テンプレートの枠線範囲外の明細行にも枠線を付ける
        // ========================================
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: itemsStartRow - 1,  // 11行目（0-indexed で 10）
              endRowIndex: itemsEndRow,           // 明細最終行まで
              startColumnIndex: 0,  // A列
              endColumnIndex: 10    // J列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // ========================================
        // 【税率別集計】ヘッダーの枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: summaryStartRow - 2,  // 【税率別集計】行（0-indexed）
              endRowIndex: summaryStartRow - 1,
              startColumnIndex: 0,  // A列
              endColumnIndex: 1
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // 税率別集計エリア（B:C列）の枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: summaryStartRow - 1,  // 8%対象の行から（0-indexed）
              endRowIndex: summaryStartRow + 3,     // 消費税(10%)の行まで
              startColumnIndex: 1,  // B列
              endColumnIndex: 3     // C列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        },
        // 小計・消費税・合計エリア（G:H列）の枠線（動的位置）
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: totalStartRow - 1,    // 小計の行から（0-indexed）
              endRowIndex: totalStartRow + 2,       // 合計の行まで
              startColumnIndex: 6,  // G列
              endColumnIndex: 8     // H列まで
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: borderRequests
        }
      });
      console.log('✅ Border formatting applied to summary area');
    }

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