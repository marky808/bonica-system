/**
 * 本番環境での請求書発行機能の包括的テストスクリプト
 * ユーザーの実際の行動パターンを模倣したストレスのないフロー検証
 */

import { performance } from 'perf_hooks';

interface TestResult {
  test: string;
  status: 'success' | 'fail' | 'warning';
  duration: number;
  details: string;
  data?: any;
}

interface InvoiceTestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}

class InvoiceFlowTester {
  private baseUrl: string;
  private results: TestResult[] = [];
  private responseTimes: number[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<{ data: any; status: number; duration: number }> {
    const startTime = performance.now();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const duration = performance.now() - startTime;
      this.responseTimes.push(duration);

      const data = await response.json();
      return { data, status: response.status, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      throw { error, duration };
    }
  }

  private addResult(test: string, status: 'success' | 'fail' | 'warning', details: string, duration: number, data?: any) {
    this.results.push({ test, status, duration, details, data });

    const statusIcon = {
      success: '✅',
      fail: '❌',
      warning: '⚠️'
    };

    console.log(`${statusIcon[status]} ${test}: ${details} (${duration.toFixed(0)}ms)`);
  }

  // テスト1: 月次請求書データ取得の基本フロー
  async testMonthlyInvoiceDataRetrieval() {
    console.log('\n📊 テスト1: 月次請求書データ取得フロー');

    const testYear = new Date().getFullYear();
    const testMonth = new Date().getMonth() + 1;

    try {
      const { data, status, duration } = await this.makeRequest(
        `/api/invoices/monthly?year=${testYear}&month=${testMonth}`
      );

      if (status === 200 && data.summaries) {
        this.addResult(
          '月次データ取得',
          'success',
          `${data.summaries.length}件の顧客データを取得`,
          duration,
          { customerCount: data.summaries.length, totalAmount: data.summaries.reduce((sum: number, s: any) => sum + s.totalAmount, 0) }
        );

        // データ品質チェック
        const invalidData = data.summaries.filter((s: any) => !s.customerId || !s.customerName || s.totalAmount < 0);
        if (invalidData.length > 0) {
          this.addResult(
            'データ品質チェック',
            'warning',
            `${invalidData.length}件の不正なデータが検出されました`,
            0
          );
        } else {
          this.addResult(
            'データ品質チェック',
            'success',
            '全データが正常な形式です',
            0
          );
        }

        return data.summaries;
      } else {
        this.addResult(
          '月次データ取得',
          'fail',
          `APIエラー: ${status} - ${data.error || 'Unknown error'}`,
          duration
        );
        return [];
      }
    } catch (error: any) {
      this.addResult(
        '月次データ取得',
        'fail',
        `リクエストエラー: ${error.error?.message || error.message}`,
        error.duration || 0
      );
      return [];
    }
  }

  // テスト2: 単一顧客の請求書作成フロー
  async testSingleInvoiceCreation(customerData: any) {
    console.log('\n📋 テスト2: 単一顧客請求書作成フロー');

    if (!customerData || customerData.hasInvoice) {
      this.addResult(
        '請求書作成前提条件',
        'warning',
        '既に請求書が作成済みまたは顧客データが無効',
        0
      );
      return null;
    }

    try {
      const requestBody = {
        customerId: customerData.customerId,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      };

      const { data, status, duration } = await this.makeRequest(
        '/api/invoices/monthly',
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        }
      );

      if (status === 200 && data.invoiceId) {
        this.addResult(
          '請求書作成',
          'success',
          `請求書ID: ${data.invoiceId}, 金額: ¥${data.totalAmount.toLocaleString()}`,
          duration,
          { invoiceId: data.invoiceId, amount: data.totalAmount }
        );

        // 作成後の検証
        await this.verifyInvoiceCreation(data.invoiceId, customerData.customerId);

        return data;
      } else {
        this.addResult(
          '請求書作成',
          'fail',
          `作成失敗: ${status} - ${data.error || 'Unknown error'}`,
          duration
        );
        return null;
      }
    } catch (error: any) {
      this.addResult(
        '請求書作成',
        'fail',
        `リクエストエラー: ${error.error?.message || error.message}`,
        error.duration || 0
      );
      return null;
    }
  }

  // テスト3: 請求書作成後の検証
  async verifyInvoiceCreation(invoiceId: string, customerId: string) {
    console.log('\n🔍 テスト3: 請求書作成後検証');

    try {
      // 月次データを再取得して請求書が反映されているかチェック
      const { data, status, duration } = await this.makeRequest(
        `/api/invoices/monthly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}&customerId=${customerId}`
      );

      if (status === 200 && data.summaries) {
        const customerData = data.summaries.find((s: any) => s.customerId === customerId);

        if (customerData && customerData.hasInvoice) {
          this.addResult(
            '請求書作成後検証',
            'success',
            `顧客データに請求書情報が正しく反映されました`,
            duration
          );
        } else {
          this.addResult(
            '請求書作成後検証',
            'warning',
            `顧客データの請求書フラグが更新されていません`,
            duration
          );
        }
      }
    } catch (error: any) {
      this.addResult(
        '請求書作成後検証',
        'fail',
        `検証エラー: ${error.error?.message || error.message}`,
        error.duration || 0
      );
    }
  }

  // テスト4: Google Sheets請求書作成フロー
  async testGoogleSheetsInvoiceCreation() {
    console.log('\n📊 テスト4: Google Sheets請求書作成フロー');

    try {
      // まず配送データを取得
      const { data: deliveriesData, status: deliveriesStatus, duration: deliveriesDuration } = await this.makeRequest('/api/deliveries');

      if (deliveriesStatus === 401) {
        this.addResult(
          'Google Sheets請求書',
          'warning',
          'API認証が必要なため、Google Sheets機能のテストをスキップ',
          deliveriesDuration
        );
        return;
      }

      // テンプレート取得のテスト
      const { data: templatesData, status: templatesStatus, duration: templatesDuration } = await this.makeRequest('/api/templates');

      if (templatesStatus === 200) {
        const invoiceTemplate = templatesData.find((t: any) => t.type === 'invoice');

        if (invoiceTemplate) {
          this.addResult(
            'Google Sheetsテンプレート取得',
            'success',
            `請求書テンプレート取得成功 (ID: ${invoiceTemplate.templateSheetId})`,
            templatesDuration
          );
        } else {
          this.addResult(
            'Google Sheetsテンプレート取得',
            'warning',
            '請求書テンプレートが見つかりません',
            templatesDuration
          );
        }
      }
    } catch (error: any) {
      this.addResult(
        'Google Sheets請求書',
        'fail',
        `テストエラー: ${error.error?.message || error.message}`,
        error.duration || 0
      );
    }
  }

  // テスト5: エラーハンドリングとエッジケース
  async testErrorHandlingAndEdgeCases() {
    console.log('\n🚨 テスト5: エラーハンドリング・エッジケーステスト');

    // 無効な月でのリクエスト
    try {
      const { data, status, duration } = await this.makeRequest('/api/invoices/monthly?year=2024&month=13');

      if (status >= 400) {
        this.addResult(
          '無効な月のバリデーション',
          'success',
          `正常にエラーレスポンスを返しました (${status})`,
          duration
        );
      } else {
        this.addResult(
          '無効な月のバリデーション',
          'warning',
          '無効な月でも正常レスポンスが返されました',
          duration
        );
      }
    } catch (error: any) {
      this.addResult(
        '無効な月のバリデーション',
        'success',
        'リクエストエラーで適切に処理されました',
        error.duration || 0
      );
    }

    // 存在しない顧客IDでの請求書作成
    try {
      const { data, status, duration } = await this.makeRequest(
        '/api/invoices/monthly',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'nonexistent-customer-id',
            year: 2024,
            month: 1
          })
        }
      );

      if (status >= 400) {
        this.addResult(
          '存在しない顧客ID処理',
          'success',
          `適切にエラーレスポンスを返しました (${status})`,
          duration
        );
      } else {
        this.addResult(
          '存在しない顧客ID処理',
          'warning',
          '存在しない顧客IDでも正常処理されました',
          duration
        );
      }
    } catch (error: any) {
      this.addResult(
        '存在しない顧客ID処理',
        'success',
        'リクエストエラーで適切に処理されました',
        error.duration || 0
      );
    }
  }

  // テスト6: パフォーマンス・負荷テスト
  async testPerformanceAndLoad() {
    console.log('\n⚡ テスト6: パフォーマンス・負荷テスト');

    const concurrentRequests = 5;
    const requests = [];

    // 同時リクエストテスト
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        this.makeRequest(`/api/invoices/monthly?year=2024&month=${(i % 12) + 1}`)
      );
    }

    try {
      const startTime = performance.now();
      const results = await Promise.allSettled(requests);
      const totalDuration = performance.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.addResult(
        '同時リクエスト処理',
        successful > failed ? 'success' : 'warning',
        `${concurrentRequests}件中${successful}件成功 (総時間: ${totalDuration.toFixed(0)}ms)`,
        totalDuration
      );

      // 平均レスポンス時間の評価
      const avgResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

      if (avgResponseTime < 1000) {
        this.addResult(
          'レスポンス時間評価',
          'success',
          `平均レスポンス時間: ${avgResponseTime.toFixed(0)}ms (良好)`,
          0
        );
      } else if (avgResponseTime < 3000) {
        this.addResult(
          'レスポンス時間評価',
          'warning',
          `平均レスポンス時間: ${avgResponseTime.toFixed(0)}ms (改善の余地あり)`,
          0
        );
      } else {
        this.addResult(
          'レスポンス時間評価',
          'fail',
          `平均レスポンス時間: ${avgResponseTime.toFixed(0)}ms (遅い)`,
          0
        );
      }

    } catch (error: any) {
      this.addResult(
        '同時リクエスト処理',
        'fail',
        `負荷テストエラー: ${error.message}`,
        0
      );
    }
  }

  // メイン実行関数
  async runComprehensiveTest(): Promise<InvoiceTestMetrics> {
    console.log('🚀 請求書発行機能 包括的テスト開始');
    console.log('='.repeat(60));

    const overallStartTime = performance.now();

    // テスト1: 月次データ取得
    const monthlyData = await this.testMonthlyInvoiceDataRetrieval();

    // テスト2: 単一請求書作成（データがある場合）
    if (monthlyData.length > 0) {
      const testCustomer = monthlyData.find((d: any) => !d.hasInvoice);
      if (testCustomer) {
        await this.testSingleInvoiceCreation(testCustomer);
      } else {
        this.addResult(
          '請求書作成テスト',
          'warning',
          '全顧客が既に請求書作成済みのため、作成テストをスキップ',
          0
        );
      }
    }

    // テスト4: Google Sheets機能
    await this.testGoogleSheetsInvoiceCreation();

    // テスト5: エラーハンドリング
    await this.testErrorHandlingAndEdgeCases();

    // テスト6: パフォーマンステスト
    await this.testPerformanceAndLoad();

    const overallDuration = performance.now() - overallStartTime;

    // 結果集計
    const metrics = this.generateTestMetrics(overallDuration);
    this.displayTestSummary(metrics);

    return metrics;
  }

  private generateTestMetrics(overallDuration: number): InvoiceTestMetrics {
    const passed = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    return {
      totalTests: this.results.length,
      passed,
      failed,
      warnings,
      averageResponseTime: this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
        : 0,
      maxResponseTime: this.responseTimes.length > 0 ? Math.max(...this.responseTimes) : 0,
      minResponseTime: this.responseTimes.length > 0 ? Math.min(...this.responseTimes) : 0
    };
  }

  private displayTestSummary(metrics: InvoiceTestMetrics) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 請求書発行機能テスト結果サマリー');
    console.log('='.repeat(60));

    console.log(`📊 総テスト数: ${metrics.totalTests}`);
    console.log(`✅ 成功: ${metrics.passed}`);
    console.log(`❌ 失敗: ${metrics.failed}`);
    console.log(`⚠️  警告: ${metrics.warnings}`);
    console.log(`📈 成功率: ${((metrics.passed / metrics.totalTests) * 100).toFixed(1)}%`);

    console.log('\n⚡ パフォーマンス指標:');
    console.log(`📊 平均レスポンス時間: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`⬆️  最大レスポンス時間: ${metrics.maxResponseTime.toFixed(0)}ms`);
    console.log(`⬇️  最小レスポンス時間: ${metrics.minResponseTime.toFixed(0)}ms`);

    console.log('\n🎯 ユーザビリティ評価:');
    if (metrics.averageResponseTime < 1000 && metrics.failed === 0) {
      console.log('🌟 優秀: ストレスのないユーザー体験を提供');
    } else if (metrics.averageResponseTime < 2000 && metrics.failed <= 1) {
      console.log('👍 良好: 概ね満足できるユーザー体験');
    } else if (metrics.failed <= 2) {
      console.log('⚠️  改善必要: ユーザビリティの向上が必要');
    } else {
      console.log('🚨 問題あり: 緊急の修正が必要');
    }

    console.log('\n📋 詳細結果:');
    this.results.forEach((result, index) => {
      const statusIcon = { success: '✅', fail: '❌', warning: '⚠️' };
      console.log(`${index + 1}. ${statusIcon[result.status]} ${result.test}: ${result.details}`);
    });
  }
}

// 実行
async function runInvoiceFlowTest() {
  const baseUrl = 'https://bonica-system-82gujggfu-808worksjp-gmailcoms-projects.vercel.app';
  const tester = new InvoiceFlowTester(baseUrl);

  try {
    const metrics = await tester.runComprehensiveTest();

    console.log('\n🎉 請求書発行機能テスト完了');
    console.log(`📝 テスト結果: ${metrics.passed}成功 / ${metrics.failed}失敗 / ${metrics.warnings}警告`);

    // 結果に基づく推奨事項
    if (metrics.failed > 0) {
      console.log('\n🔧 推奨事項:');
      console.log('- 失敗したテストの詳細を確認し、根本原因を調査してください');
      console.log('- エラーハンドリングの改善を検討してください');
    }

    if (metrics.averageResponseTime > 2000) {
      console.log('- パフォーマンス最適化を検討してください');
      console.log('- データベースクエリの最適化やキャッシュ戦略の見直しを推奨します');
    }

  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  }
}

// 実行
runInvoiceFlowTest().catch(console.error);