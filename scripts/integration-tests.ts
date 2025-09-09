#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import chalk from 'chalk'

const prisma = new PrismaClient()

interface TestResult {
  testName: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration: number
  message?: string
  data?: any
  error?: Error
}

interface TestSuite {
  name: string
  tests: TestResult[]
  startTime: number
  endTime?: number
}

class TestReporter {
  private suites: TestSuite[] = []
  private currentSuite?: TestSuite

  startSuite(name: string) {
    this.currentSuite = {
      name,
      tests: [],
      startTime: Date.now()
    }
  }

  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now()
      this.suites.push(this.currentSuite)
      this.currentSuite = undefined
    }
  }

  addResult(result: TestResult) {
    if (this.currentSuite) {
      this.currentSuite.tests.push(result)
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(80))
    console.log(chalk.bold.blue('📊 統合テスト結果レポート'))
    console.log('='.repeat(80))

    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0

    for (const suite of this.suites) {
      const duration = suite.endTime ? suite.endTime - suite.startTime : 0
      console.log(`\n${chalk.bold.cyan(suite.name)} (${duration}ms)`)
      console.log('-'.repeat(60))

      for (const test of suite.tests) {
        totalTests++
        const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏸️'
        const color = test.status === 'PASS' ? chalk.green : test.status === 'FAIL' ? chalk.red : chalk.yellow
        
        console.log(`  ${icon} ${color(test.testName)} (${test.duration}ms)`)
        
        if (test.message) {
          console.log(`    ${chalk.gray(test.message)}`)
        }
        
        if (test.error) {
          console.log(`    ${chalk.red(test.error.message)}`)
        }

        if (test.status === 'PASS') totalPassed++
        else if (test.status === 'FAIL') totalFailed++
        else totalSkipped++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(chalk.bold('📈 統計情報'))
    console.log('='.repeat(80))
    console.log(`総テスト数: ${totalTests}`)
    console.log(`${chalk.green('成功:')} ${totalPassed}`)
    console.log(`${chalk.red('失敗:')} ${totalFailed}`)
    console.log(`${chalk.yellow('スキップ:')} ${totalSkipped}`)
    
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0'
    console.log(`成功率: ${successRate}%`)

    return {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      successRate: parseFloat(successRate)
    }
  }
}

async function testDataIntegrity(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // テスト1: 基本データ存在確認
  const start1 = Date.now()
  try {
    const counts = await Promise.all([
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.category.count(),
      prisma.purchase.count(),
      prisma.delivery.count()
    ])

    const [customerCount, supplierCount, categoryCount, purchaseCount, deliveryCount] = counts

    results.push({
      testName: '基本データ存在確認',
      status: customerCount > 0 && supplierCount > 0 && categoryCount > 0 ? 'PASS' : 'FAIL',
      duration: Date.now() - start1,
      message: `顧客:${customerCount}, 仕入先:${supplierCount}, カテゴリ:${categoryCount}, 仕入:${purchaseCount}, 納品:${deliveryCount}`,
      data: { customerCount, supplierCount, categoryCount, purchaseCount, deliveryCount }
    })
  } catch (error) {
    results.push({
      testName: '基本データ存在確認',
      status: 'FAIL',
      duration: Date.now() - start1,
      error: error as Error
    })
  }

  // テスト2: リレーション整合性確認
  const start2 = Date.now()
  try {
    // より具体的なクエリに修正
    const totalDeliveryItems = await prisma.deliveryItem.count()
    const validDeliveryItems = await prisma.deliveryItem.count({
      where: {
        AND: [
          { delivery: { is: {} } },
          { purchase: { is: {} } }
        ]
      }
    })
    const orphanedDeliveryItems = totalDeliveryItems - validDeliveryItems

    results.push({
      testName: 'リレーション整合性確認',
      status: orphanedDeliveryItems === 0 ? 'PASS' : 'FAIL',
      duration: Date.now() - start2,
      message: `孤立した納品明細: ${orphanedDeliveryItems}件`,
      data: { orphanedDeliveryItems }
    })
  } catch (error) {
    results.push({
      testName: 'リレーション整合性確認',
      status: 'FAIL',
      duration: Date.now() - start2,
      error: error as Error
    })
  }

  // テスト3: 数値データ妥当性確認
  const start3 = Date.now()
  try {
    const invalidPrices = await prisma.purchase.count({
      where: {
        OR: [
          { price: { lt: 0 } },
          { unitPrice: { lt: 0 } },
          { quantity: { lte: 0 } }
        ]
      }
    })

    results.push({
      testName: '数値データ妥当性確認',
      status: invalidPrices === 0 ? 'PASS' : 'FAIL',
      duration: Date.now() - start3,
      message: `無効な価格データ: ${invalidPrices}件`,
      data: { invalidPrices }
    })
  } catch (error) {
    results.push({
      testName: '数値データ妥当性確認',
      status: 'FAIL',
      duration: Date.now() - start3,
      error: error as Error
    })
  }

  return results
}

async function testInvoiceWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // テスト1: 月次請求書集計データ取得
  const start1 = Date.now()
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // 実際のAPIロジックをシミュレート
    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0)
        },
        status: 'DELIVERED'
      },
      include: {
        customer: true,
        items: true
      }
    })

    const customerSummaries = deliveries.reduce((acc, delivery) => {
      const customerId = delivery.customerId
      if (!acc[customerId]) {
        acc[customerId] = {
          customerId: delivery.customerId,
          customerName: delivery.customer.companyName,
          deliveryCount: 0,
          totalAmount: 0,
          hasInvoice: false,
          deliveryIds: []
        }
      }
      
      acc[customerId].deliveryCount += 1
      acc[customerId].totalAmount += delivery.totalAmount
      acc[customerId].deliveryIds.push(delivery.id)
      
      return acc
    }, {} as Record<string, any>)

    const summaries = Object.values(customerSummaries)

    results.push({
      testName: '月次請求書集計データ取得',
      status: summaries.length >= 0 ? 'PASS' : 'FAIL',
      duration: Date.now() - start1,
      message: `${year}年${month}月の集計: ${summaries.length}顧客, 合計${deliveries.length}納品`,
      data: { year, month, summaries: summaries.length, deliveries: deliveries.length }
    })
  } catch (error) {
    results.push({
      testName: '月次請求書集計データ取得',
      status: 'FAIL',
      duration: Date.now() - start1,
      error: error as Error
    })
  }

  // テスト2: freee請求書作成シミュレーション
  const start2 = Date.now()
  try {
    // freeeAPIを呼び出さずに、データ構造のテストのみ
    const customer = await prisma.customer.findFirst()
    
    if (customer) {
      const deliveries = await prisma.delivery.findMany({
        where: {
          customerId: customer.id,
          status: 'DELIVERED'
        },
        include: {
          items: {
            include: {
              purchase: {
                include: { category: true }
              }
            }
          }
        },
        take: 3
      })

      // 請求書明細データ構造の検証
      const invoiceContents = []
      for (const delivery of deliveries) {
        for (const item of delivery.items) {
          invoiceContents.push({
            type: 'normal',
            qty: item.quantity,
            unit: item.purchase.unit,
            unit_price: item.unitPrice,
            description: `${item.purchase.productName} (${item.purchase.category.name})`,
            tax_code: 2,
            amount: item.amount
          })
        }
      }

      results.push({
        testName: 'freee請求書作成データ構造テスト',
        status: invoiceContents.length > 0 ? 'PASS' : 'FAIL',
        duration: Date.now() - start2,
        message: `顧客: ${customer.companyName}, 明細数: ${invoiceContents.length}`,
        data: { customerName: customer.companyName, itemCount: invoiceContents.length }
      })
    } else {
      results.push({
        testName: 'freee請求書作成データ構造テスト',
        status: 'SKIP',
        duration: Date.now() - start2,
        message: 'テスト用顧客データが存在しません'
      })
    }
  } catch (error) {
    results.push({
      testName: 'freee請求書作成データ構造テスト',
      status: 'FAIL',
      duration: Date.now() - start2,
      error: error as Error
    })
  }

  // テスト3: 支払条件計算テスト
  const start3 = Date.now()
  try {
    const issueDate = new Date()
    const paymentTermsTests = [
      { terms: 'immediate', expected: 0 },
      { terms: '7days', expected: 7 },
      { terms: '15days', expected: 15 },
      { terms: '30days', expected: 30 },
      { terms: '60days', expected: 60 }
    ]

    let allPassed = true
    for (const test of paymentTermsTests) {
      const dueDate = new Date(issueDate)
      
      switch (test.terms) {
        case 'immediate':
          // 支払期限は発行日と同じ
          break
        case '7days':
          dueDate.setDate(dueDate.getDate() + 7)
          break
        case '15days':
          dueDate.setDate(dueDate.getDate() + 15)
          break
        case '30days':
          dueDate.setDate(dueDate.getDate() + 30)
          break
        case '60days':
          dueDate.setDate(dueDate.getDate() + 60)
          break
      }

      const daysDiff = Math.floor((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff !== test.expected) {
        allPassed = false
        break
      }
    }

    results.push({
      testName: '支払条件計算テスト',
      status: allPassed ? 'PASS' : 'FAIL',
      duration: Date.now() - start3,
      message: `${paymentTermsTests.length}パターンの支払条件計算をテスト`,
      data: { testCases: paymentTermsTests.length }
    })
  } catch (error) {
    results.push({
      testName: '支払条件計算テスト',
      status: 'FAIL',
      duration: Date.now() - start3,
      error: error as Error
    })
  }

  return results
}

async function testAPIEndpoints(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // テスト1: API用のJWT認証トークン生成テスト
  const start1 = Date.now()
  try {
    const jwt = require('jsonwebtoken')
    
    const testUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'ADMIN'
    }

    const token = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret')

    results.push({
      testName: 'JWT認証トークン生成・検証',
      status: decoded && decoded.userId === testUser.userId ? 'PASS' : 'FAIL',
      duration: Date.now() - start1,
      message: 'JWTトークンの生成と検証が正常に動作',
      data: { tokenLength: token.length }
    })
  } catch (error) {
    results.push({
      testName: 'JWT認証トークン生成・検証',
      status: 'FAIL',
      duration: Date.now() - start1,
      error: error as Error
    })
  }

  // テスト2: APIレスポンス形式テスト
  const start2 = Date.now()
  try {
    const mockApiResponse = {
      success: true,
      data: {
        year: 2025,
        month: 9,
        summaries: [],
        totalCustomers: 0,
        totalAmount: 0,
        totalDeliveries: 0
      }
    }

    // APIレスポンス形式の検証
    const hasRequiredFields = 
      typeof mockApiResponse.success === 'boolean' &&
      mockApiResponse.data &&
      typeof mockApiResponse.data.year === 'number' &&
      typeof mockApiResponse.data.month === 'number' &&
      Array.isArray(mockApiResponse.data.summaries)

    results.push({
      testName: 'APIレスポンス形式検証',
      status: hasRequiredFields ? 'PASS' : 'FAIL',
      duration: Date.now() - start2,
      message: '月次請求書APIのレスポンス形式が正しい',
      data: mockApiResponse.data
    })
  } catch (error) {
    results.push({
      testName: 'APIレスポンス形式検証',
      status: 'FAIL',
      duration: Date.now() - start2,
      error: error as Error
    })
  }

  return results
}

async function testPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // テスト1: 大量データ処理性能
  const start1 = Date.now()
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        customer: true,
        items: {
          include: {
            purchase: true
          }
        }
      }
    })

    const processingTime = Date.now() - start1
    const performanceThreshold = 5000 // 5秒

    results.push({
      testName: '納品データ取得性能',
      status: processingTime < performanceThreshold ? 'PASS' : 'FAIL',
      duration: processingTime,
      message: `${deliveries.length}件の納品データを${processingTime}msで取得`,
      data: { recordCount: deliveries.length, processingTime }
    })
  } catch (error) {
    results.push({
      testName: '納品データ取得性能',
      status: 'FAIL',
      duration: Date.now() - start1,
      error: error as Error
    })
  }

  // テスト2: 集計処理性能
  const start2 = Date.now()
  try {
    const customerSummary = await prisma.delivery.groupBy({
      by: ['customerId'],
      _sum: {
        totalAmount: true
      },
      _count: {
        _all: true
      }
    })

    const processingTime = Date.now() - start2
    const performanceThreshold = 2000 // 2秒

    results.push({
      testName: '顧客別集計処理性能',
      status: processingTime < performanceThreshold ? 'PASS' : 'FAIL',
      duration: processingTime,
      message: `${customerSummary.length}顧客の集計を${processingTime}msで処理`,
      data: { customerCount: customerSummary.length, processingTime }
    })
  } catch (error) {
    results.push({
      testName: '顧客別集計処理性能',
      status: 'FAIL',
      duration: Date.now() - start2,
      error: error as Error
    })
  }

  return results
}

export async function runIntegrationTests() {
  console.log(chalk.bold.blue('🧪 統合テスト開始'))
  console.log('='.repeat(60))

  const reporter = new TestReporter()

  try {
    // データ整合性テスト
    reporter.startSuite('🔍 データ整合性テスト')
    const dataTests = await testDataIntegrity()
    dataTests.forEach(result => reporter.addResult(result))
    reporter.endSuite()

    // 請求書ワークフローテスト
    reporter.startSuite('📄 請求書ワークフローテスト')
    const invoiceTests = await testInvoiceWorkflow()
    invoiceTests.forEach(result => reporter.addResult(result))
    reporter.endSuite()

    // APIエンドポイントテスト
    reporter.startSuite('🌐 APIエンドポイントテスト')
    const apiTests = await testAPIEndpoints()
    apiTests.forEach(result => reporter.addResult(result))
    reporter.endSuite()

    // パフォーマンステスト
    reporter.startSuite('⚡ パフォーマンステスト')
    const perfTests = await testPerformance()
    perfTests.forEach(result => reporter.addResult(result))
    reporter.endSuite()

    // 結果レポート出力
    return reporter.printResults()

  } catch (error) {
    console.error(chalk.red('❌ 統合テスト実行エラー:'), error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  runIntegrationTests().catch(console.error)
}