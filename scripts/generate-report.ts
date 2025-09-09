#!/usr/bin/env tsx
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'

interface ReportData {
  timestamp: string
  summary: {
    success: boolean
    totalDuration: number
    testsPassed: number
    testsFailed: number
    successRate: number
  }
  phases: {
    dataGeneration: { status: string; duration: number }
    testing: { status: string; duration: number; results?: any }
  }
  environment: {
    nodeVersion: string
    platform: string
    memoryUsage: NodeJS.MemoryUsage
  }
}

async function generateHTMLReport(reports: ReportData[], outputPath: string) {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BONICA システム テストレポート</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f7fa;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fb;
        }
        .metric {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .success { color: #10b981; }
        .failure { color: #ef4444; }
        .warning { color: #f59e0b; }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .test-runs {
            display: grid;
            gap: 15px;
        }
        .test-run {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            transition: box-shadow 0.2s;
        }
        .test-run:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .test-run.success {
            border-left: 4px solid #10b981;
        }
        .test-run.failure {
            border-left: 4px solid #ef4444;
        }
        .test-run-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-success {
            background: #dcfce7;
            color: #166534;
        }
        .status-failure {
            background: #fee2e2;
            color: #991b1b;
        }
        .test-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .detail-item {
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
        }
        .detail-label {
            font-size: 0.8em;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .detail-value {
            font-weight: 600;
        }
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .footer {
            background: #374151;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: repeat(2, 1fr);
            }
            .test-run-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌾 BONICA システム</h1>
            <p>農産物仕入れ・納品・請求管理システム テストレポート</p>
            <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value success">${reports.length}</div>
                <div class="metric-label">総実行回数</div>
            </div>
            <div class="metric">
                <div class="metric-value ${reports.filter(r => r.summary.success).length === reports.length ? 'success' : 'failure'}">
                    ${reports.filter(r => r.summary.success).length}
                </div>
                <div class="metric-label">成功回数</div>
            </div>
            <div class="metric">
                <div class="metric-value success">
                    ${reports.reduce((sum, r) => sum + r.summary.testsPassed, 0)}
                </div>
                <div class="metric-label">成功テスト数</div>
            </div>
            <div class="metric">
                <div class="metric-value ${reports.reduce((sum, r) => sum + r.summary.testsFailed, 0) > 0 ? 'failure' : 'success'}">
                    ${reports.reduce((sum, r) => sum + r.summary.testsFailed, 0)}
                </div>
                <div class="metric-label">失敗テスト数</div>
            </div>
            <div class="metric">
                <div class="metric-value warning">
                    ${(reports.reduce((sum, r) => sum + r.summary.totalDuration, 0) / reports.length / 1000).toFixed(1)}s
                </div>
                <div class="metric-label">平均実行時間</div>
            </div>
            <div class="metric">
                <div class="metric-value ${reports.reduce((sum, r) => sum + r.summary.successRate, 0) / reports.length >= 95 ? 'success' : 'warning'}">
                    ${(reports.reduce((sum, r) => sum + r.summary.successRate, 0) / reports.length).toFixed(1)}%
                </div>
                <div class="metric-label">平均成功率</div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>📊 実行結果詳細</h2>
                <div class="test-runs">
                    ${reports.map((report, index) => `
                        <div class="test-run ${report.summary.success ? 'success' : 'failure'}">
                            <div class="test-run-header">
                                <div>
                                    <strong>実行 #${reports.length - index}</strong>
                                    <span style="margin-left: 15px; color: #6b7280;">
                                        ${new Date(report.timestamp).toLocaleString('ja-JP')}
                                    </span>
                                </div>
                                <span class="status-badge ${report.summary.success ? 'status-success' : 'status-failure'}">
                                    ${report.summary.success ? '成功' : '失敗'}
                                </span>
                            </div>
                            <div class="test-details">
                                <div class="detail-item">
                                    <div class="detail-label">総実行時間</div>
                                    <div class="detail-value">${(report.summary.totalDuration / 1000).toFixed(2)}秒</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">成功テスト</div>
                                    <div class="detail-value success">${report.summary.testsPassed}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">失敗テスト</div>
                                    <div class="detail-value failure">${report.summary.testsFailed}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">成功率</div>
                                    <div class="detail-value">${report.summary.successRate.toFixed(1)}%</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">データ生成</div>
                                    <div class="detail-value">${report.phases.dataGeneration.duration}ms</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">テスト実行</div>
                                    <div class="detail-value">${report.phases.testing.duration}ms</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2>🖥️ 実行環境情報</h2>
                <div class="detail-item">
                    <div class="detail-label">Node.js バージョン</div>
                    <div class="detail-value">${reports[0]?.environment.nodeVersion || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">プラットフォーム</div>
                    <div class="detail-value">${reports[0]?.environment.platform || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🌾 BONICA 農産物管理システム | Powered by Next.js + Prisma + SQLite</p>
            <p>このレポートは自動生成されました</p>
        </div>
    </div>
</body>
</html>`

  await fs.writeFile(outputPath, html)
}

export async function generateReport(format: 'json' | 'html' | 'both' = 'both') {
  console.log(chalk.bold.blue('📄 テストレポート生成開始'))
  
  try {
    const reportsDir = path.join(process.cwd(), 'test-reports')
    
    // レポートディレクトリが存在するかチェック
    try {
      await fs.access(reportsDir)
    } catch {
      console.error(chalk.red('❌ test-reports ディレクトリが見つかりません'))
      console.log(chalk.yellow('💡 先に npm run test:workflow を実行してください'))
      return
    }

    // JSONレポートファイルを読み込み
    const files = await fs.readdir(reportsDir)
    const reportFiles = files
      .filter(file => file.startsWith('test-workflow-') && file.endsWith('.json'))
      .sort()

    if (reportFiles.length === 0) {
      console.error(chalk.red('❌ テストレポートが見つかりません'))
      console.log(chalk.yellow('💡 先に npm run test:workflow を実行してください'))
      return
    }

    console.log(chalk.blue(`📁 ${reportFiles.length}件のレポートファイルを発見`))

    const reports: ReportData[] = []
    for (const file of reportFiles) {
      try {
        const content = await fs.readFile(path.join(reportsDir, file), 'utf-8')
        reports.push(JSON.parse(content))
      } catch (error) {
        console.warn(chalk.yellow(`⚠️ レポート読み込みエラー (${file}): ${error}`))
      }
    }

    if (reports.length === 0) {
      console.error(chalk.red('❌ 有効なレポートデータが見つかりません'))
      return
    }

    console.log(chalk.green(`✅ ${reports.length}件のレポートを読み込み完了`))

    // 統計情報を計算
    const stats = {
      totalRuns: reports.length,
      successfulRuns: reports.filter(r => r.summary.success).length,
      totalTests: reports.reduce((sum, r) => sum + r.summary.testsPassed + r.summary.testsFailed, 0),
      totalPassed: reports.reduce((sum, r) => sum + r.summary.testsPassed, 0),
      totalFailed: reports.reduce((sum, r) => sum + r.summary.testsFailed, 0),
      averageSuccessRate: reports.reduce((sum, r) => sum + r.summary.successRate, 0) / reports.length,
      averageDuration: reports.reduce((sum, r) => sum + r.summary.totalDuration, 0) / reports.length
    }

    // コンソールに統計表示
    console.log(chalk.bold.cyan('\n📊 テスト実行統計'))
    console.log('─'.repeat(50))
    console.table({
      '総実行回数': stats.totalRuns,
      '成功回数': stats.successfulRuns,
      '総テスト数': stats.totalTests,
      '成功テスト数': stats.totalPassed,
      '失敗テスト数': stats.totalFailed,
      '平均成功率': `${stats.averageSuccessRate.toFixed(1)}%`,
      '平均実行時間': `${(stats.averageDuration / 1000).toFixed(2)}秒`
    })

    // JSONレポート生成
    if (format === 'json' || format === 'both') {
      const jsonReport = {
        generatedAt: new Date().toISOString(),
        statistics: stats,
        reports: reports.slice(-10), // 最新10件
        recommendations: generateRecommendations(stats)
      }

      const jsonPath = path.join(reportsDir, 'consolidated-report.json')
      await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2))
      console.log(chalk.green(`📄 JSON レポート生成: ${path.basename(jsonPath)}`))
    }

    // HTMLレポート生成
    if (format === 'html' || format === 'both') {
      const htmlPath = path.join(reportsDir, 'test-report.html')
      await generateHTMLReport(reports.slice(-20), htmlPath) // 最新20件
      console.log(chalk.green(`🌐 HTML レポート生成: ${path.basename(htmlPath)}`))
      console.log(chalk.blue(`   ブラウザで開く: file://${htmlPath}`))
    }

    // 推奨事項を表示
    const recommendations = generateRecommendations(stats)
    if (recommendations.length > 0) {
      console.log(chalk.bold.yellow('\n💡 推奨事項'))
      console.log('─'.repeat(50))
      recommendations.forEach(rec => {
        console.log(`${rec.type === 'warning' ? '⚠️' : 'ℹ️'} ${rec.message}`)
      })
    }

    console.log(chalk.bold.green('\n✨ レポート生成完了'))

  } catch (error) {
    console.error(chalk.red('❌ レポート生成エラー:'), error)
    throw error
  }
}

function generateRecommendations(stats: any) {
  const recommendations = []

  if (stats.averageSuccessRate < 95) {
    recommendations.push({
      type: 'warning',
      message: `テスト成功率が${stats.averageSuccessRate.toFixed(1)}%です。95%以上を目標に改善を検討してください。`
    })
  }

  if (stats.totalFailed > 0) {
    recommendations.push({
      type: 'warning',
      message: `${stats.totalFailed}個のテストが失敗しています。ログを確認して修正してください。`
    })
  }

  if (stats.averageDuration > 60000) {
    recommendations.push({
      type: 'info',
      message: `平均実行時間が${(stats.averageDuration/1000).toFixed(1)}秒です。パフォーマンスの最適化を検討してください。`
    })
  }

  if (stats.successfulRuns < stats.totalRuns) {
    recommendations.push({
      type: 'warning',
      message: `${stats.totalRuns - stats.successfulRuns}回の実行で環境エラーが発生しています。環境の安定性を確認してください。`
    })
  }

  if (stats.totalRuns < 5) {
    recommendations.push({
      type: 'info',
      message: 'より多くのテストを実行して安定性を確認することをお勧めします。'
    })
  }

  return recommendations
}

if (require.main === module) {
  const format = (process.argv[2] as 'json' | 'html' | 'both') || 'both'
  generateReport(format).catch(console.error)
}