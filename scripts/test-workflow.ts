#!/usr/bin/env tsx
import { generateTestData } from './seed-test-data'
import { runIntegrationTests } from './integration-tests'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'

interface WorkflowResult {
  timestamp: string
  environment: {
    nodeVersion: string
    platform: string
    memoryUsage: NodeJS.MemoryUsage
  }
  phases: {
    dataGeneration: {
      status: 'SUCCESS' | 'FAILURE'
      duration: number
      error?: string
    }
    testing: {
      status: 'SUCCESS' | 'FAILURE'
      duration: number
      results?: any
      error?: string
    }
  }
  summary: {
    totalDuration: number
    success: boolean
    testsPassed: number
    testsFailed: number
    successRate: number
  }
}

async function createReportDirectory() {
  const reportsDir = path.join(process.cwd(), 'test-reports')
  try {
    await fs.mkdir(reportsDir, { recursive: true })
  } catch (error) {
    console.warn('レポートディレクトリ作成に失敗:', error)
  }
  return reportsDir
}

async function saveReport(result: WorkflowResult, reportsDir: string) {
  try {
    const fileName = `test-workflow-${Date.now()}.json`
    const filePath = path.join(reportsDir, fileName)
    await fs.writeFile(filePath, JSON.stringify(result, null, 2))
    
    // 最新レポートとしても保存
    const latestPath = path.join(reportsDir, 'latest.json')
    await fs.writeFile(latestPath, JSON.stringify(result, null, 2))
    
    console.log(chalk.blue(`📄 テストレポート保存: ${fileName}`))
    return filePath
  } catch (error) {
    console.error('レポート保存エラー:', error)
  }
}

async function generateSummaryReport(reportsDir: string) {
  try {
    const files = await fs.readdir(reportsDir)
    const reportFiles = files.filter(file => file.startsWith('test-workflow-') && file.endsWith('.json'))
    
    if (reportFiles.length < 2) return

    const reports = []
    for (const file of reportFiles.slice(-10)) { // 最新10件
      try {
        const content = await fs.readFile(path.join(reportsDir, file), 'utf-8')
        reports.push(JSON.parse(content))
      } catch (error) {
        console.warn(`レポート読み込みエラー (${file}):`, error)
      }
    }

    if (reports.length === 0) return

    // 統計情報生成
    const summary = {
      totalRuns: reports.length,
      successfulRuns: reports.filter(r => r.summary.success).length,
      averageSuccessRate: reports.reduce((sum, r) => sum + r.summary.successRate, 0) / reports.length,
      averageDuration: reports.reduce((sum, r) => sum + r.summary.totalDuration, 0) / reports.length,
      lastRun: reports[reports.length - 1].timestamp,
      trends: {
        improvingSuccessRate: reports.length > 1 && 
          reports[reports.length - 1].summary.successRate > reports[reports.length - 2].summary.successRate,
        averageTestsPassed: reports.reduce((sum, r) => sum + r.summary.testsPassed, 0) / reports.length,
        averageTestsFailed: reports.reduce((sum, r) => sum + r.summary.testsFailed, 0) / reports.length
      }
    }

    await fs.writeFile(
      path.join(reportsDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    )

    console.log(chalk.green(`📊 サマリーレポート更新 (過去${reports.length}回分)`))
    
  } catch (error) {
    console.error('サマリーレポート生成エラー:', error)
  }
}

export async function runTestWorkflow(iterations: number = 1) {
  console.log(chalk.bold.magenta('🚀 BONICA システム 自動テストワークフロー開始'))
  console.log(chalk.bold.magenta('=' .repeat(80)))
  console.log(`実行回数: ${iterations}回`)
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`)
  console.log('')

  const reportsDir = await createReportDirectory()
  const allResults: WorkflowResult[] = []

  for (let i = 1; i <= iterations; i++) {
    console.log(chalk.bold.yellow(`\n🔄 テスト実行 ${i}/${iterations}`))
    console.log('='.repeat(60))

    const workflowStart = Date.now()
    
    const result: WorkflowResult = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: `${process.platform} ${process.arch}`,
        memoryUsage: process.memoryUsage()
      },
      phases: {
        dataGeneration: {
          status: 'FAILURE',
          duration: 0
        },
        testing: {
          status: 'FAILURE',
          duration: 0
        }
      },
      summary: {
        totalDuration: 0,
        success: false,
        testsPassed: 0,
        testsFailed: 0,
        successRate: 0
      }
    }

    // フェーズ1: テストデータ生成
    console.log(chalk.blue('📦 フェーズ1: テストデータ生成'))
    const dataGenStart = Date.now()
    
    try {
      await generateTestData()
      result.phases.dataGeneration.status = 'SUCCESS'
      result.phases.dataGeneration.duration = Date.now() - dataGenStart
      console.log(chalk.green(`✅ テストデータ生成完了 (${result.phases.dataGeneration.duration}ms)`))
    } catch (error) {
      result.phases.dataGeneration.status = 'FAILURE'
      result.phases.dataGeneration.duration = Date.now() - dataGenStart
      result.phases.dataGeneration.error = error instanceof Error ? error.message : String(error)
      console.error(chalk.red(`❌ テストデータ生成失敗: ${result.phases.dataGeneration.error}`))
      
      // データ生成に失敗した場合、この回はスキップ
      result.summary.totalDuration = Date.now() - workflowStart
      allResults.push(result)
      continue
    }

    // フェーズ2: 統合テスト実行
    console.log(chalk.blue('\n🧪 フェーズ2: 統合テスト実行'))
    const testingStart = Date.now()
    
    try {
      const testResults = await runIntegrationTests()
      result.phases.testing.status = 'SUCCESS'
      result.phases.testing.duration = Date.now() - testingStart
      result.phases.testing.results = testResults
      
      result.summary.testsPassed = testResults.passed
      result.summary.testsFailed = testResults.failed
      result.summary.successRate = testResults.successRate
      
      console.log(chalk.green(`✅ 統合テスト完了 (${result.phases.testing.duration}ms)`))
    } catch (error) {
      result.phases.testing.status = 'FAILURE'
      result.phases.testing.duration = Date.now() - testingStart
      result.phases.testing.error = error instanceof Error ? error.message : String(error)
      console.error(chalk.red(`❌ 統合テスト失敗: ${result.phases.testing.error}`))
    }

    // 結果集計
    result.summary.totalDuration = Date.now() - workflowStart
    result.summary.success = 
      result.phases.dataGeneration.status === 'SUCCESS' && 
      result.phases.testing.status === 'SUCCESS' &&
      result.summary.testsFailed === 0

    allResults.push(result)

    // 結果表示
    const status = result.summary.success ? chalk.green('✅ 成功') : chalk.red('❌ 失敗')
    console.log(`\n${status} - 実行時間: ${result.summary.totalDuration}ms`)
    
    if (result.phases.testing.results) {
      console.log(`テスト結果: ${result.summary.testsPassed}成功 / ${result.summary.testsFailed}失敗 (${result.summary.successRate}%)`)
    }

    // レポート保存
    await saveReport(result, reportsDir)

    // 複数回実行の場合、間隔を空ける
    if (i < iterations) {
      console.log(chalk.gray(`⏳ 次のテストまで3秒待機...`))
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  // 全体の結果サマリー
  console.log(chalk.bold.magenta('\n🎯 テストワークフロー 総合結果'))
  console.log('='.repeat(80))

  const successfulRuns = allResults.filter(r => r.summary.success).length
  const totalTests = allResults.reduce((sum, r) => sum + r.summary.testsPassed + r.summary.testsFailed, 0)
  const totalPassed = allResults.reduce((sum, r) => sum + r.summary.testsPassed, 0)
  const totalFailed = allResults.reduce((sum, r) => sum + r.summary.testsFailed, 0)
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0'
  const averageDuration = allResults.reduce((sum, r) => sum + r.summary.totalDuration, 0) / allResults.length

  console.log(`総実行回数: ${iterations}`)
  console.log(`成功回数: ${successfulRuns} (${(successfulRuns/iterations*100).toFixed(1)}%)`)
  console.log(`総テスト数: ${totalTests}`)
  console.log(`${chalk.green('総成功テスト:')} ${totalPassed}`)
  console.log(`${chalk.red('総失敗テスト:')} ${totalFailed}`)
  console.log(`総合成功率: ${overallSuccessRate}%`)
  console.log(`平均実行時間: ${averageDuration.toFixed(0)}ms`)

  // 安定性分析
  if (iterations > 1) {
    const successRates = allResults.map(r => r.summary.successRate)
    const minSuccess = Math.min(...successRates)
    const maxSuccess = Math.max(...successRates)
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - parseFloat(overallSuccessRate), 2), 0) / iterations
    const stability = variance < 100 ? '安定' : variance < 400 ? '普通' : '不安定'

    console.log(`\n📈 安定性分析:`)
    console.log(`成功率範囲: ${minSuccess.toFixed(1)}% - ${maxSuccess.toFixed(1)}%`)
    console.log(`分散: ${variance.toFixed(1)} (${stability})`)
  }

  // サマリーレポート生成
  await generateSummaryReport(reportsDir)

  // 推奨事項
  console.log(chalk.bold.cyan('\n💡 推奨事項:'))
  if (totalFailed > 0) {
    console.log('❗ 失敗したテストがあります。ログを確認してください。')
  }
  if (iterations === 1) {
    console.log('🔄 複数回実行して安定性を確認することをお勧めします: npm run test:workflow 5')
  }
  if (parseFloat(overallSuccessRate) < 95) {
    console.log('⚠️ テスト成功率が95%未満です。システムの改善を検討してください。')
  }
  if (averageDuration > 30000) {
    console.log('⏱️ テスト実行時間が30秒を超えています。パフォーマンスの最適化を検討してください。')
  }

  console.log(chalk.bold.magenta('\n🎉 テストワークフロー完了'))
  console.log(`📁 レポート保存先: ${reportsDir}`)
  
  return {
    success: successfulRuns === iterations,
    totalRuns: iterations,
    successfulRuns,
    overallSuccessRate: parseFloat(overallSuccessRate),
    averageDuration
  }
}

if (require.main === module) {
  const iterations = parseInt(process.argv[2]) || 1
  runTestWorkflow(iterations).catch(console.error)
}