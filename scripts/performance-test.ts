#!/usr/bin/env tsx

interface PerformanceResult {
  endpoint: string
  method: string
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  successRate: number
  requestCount: number
  errorCount: number
}

const results: PerformanceResult[] = []

async function measureEndpoint(endpoint: string, method: string = 'GET', body?: any, headers?: any): Promise<PerformanceResult> {
  const requestCount = 10
  const times: number[] = []
  let errorCount = 0

  console.log(`📊 ${method} ${endpoint} パフォーマンステスト (${requestCount}回)...`)

  for (let i = 0; i < requestCount; i++) {
    const start = Date.now()
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      })

      const end = Date.now()
      times.push(end - start)

      if (!response.ok) {
        errorCount++
      }
    } catch (error) {
      const end = Date.now()
      times.push(end - start)
      errorCount++
    }
  }

  const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length
  const minResponseTime = Math.min(...times)
  const maxResponseTime = Math.max(...times)
  const successRate = ((requestCount - errorCount) / requestCount) * 100

  const result: PerformanceResult = {
    endpoint,
    method,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime,
    maxResponseTime,
    successRate: Math.round(successRate),
    requestCount,
    errorCount
  }

  results.push(result)
  return result
}

async function runPerformanceTests() {
  console.log('⚡ パフォーマンステスト開始')
  console.log('=' * 50)

  // ヘルスチェック API
  await measureEndpoint('/api/health')

  // 認証API
  await measureEndpoint('/api/auth/login', 'POST', {
    email: '808works.jp@gmail.com',
    password: '6391'
  })

  // 認証失敗
  await measureEndpoint('/api/auth/login', 'POST', {
    email: 'invalid@test.com',
    password: 'wrong'
  })

  // 静的ページ
  await measureEndpoint('/')

  console.log('\n📈 パフォーマンステスト結果')
  console.log('=' * 50)

  console.table(results.map(r => ({
    エンドポイント: `${r.method} ${r.endpoint}`,
    平均応答時間: `${r.avgResponseTime}ms`,
    最小応答時間: `${r.minResponseTime}ms`,
    最大応答時間: `${r.maxResponseTime}ms`,
    成功率: `${r.successRate}%`,
    エラー数: `${r.errorCount}/${r.requestCount}`
  })))

  // パフォーマンス評価
  console.log('\n⚡ パフォーマンス評価')
  console.log('=' * 30)

  const slowEndpoints = results.filter(r => r.avgResponseTime > 1000)
  const fastEndpoints = results.filter(r => r.avgResponseTime < 200)
  const unreliableEndpoints = results.filter(r => r.successRate < 95)

  if (slowEndpoints.length > 0) {
    console.log('🐌 遅いエンドポイント (1秒超):')
    slowEndpoints.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.avgResponseTime}ms`)
    })
  }

  if (fastEndpoints.length > 0) {
    console.log('🚀 高速エンドポイント (200ms未満):')
    fastEndpoints.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.avgResponseTime}ms`)
    })
  }

  if (unreliableEndpoints.length > 0) {
    console.log('⚠️  信頼性の低いエンドポイント (成功率95%未満):')
    unreliableEndpoints.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.successRate}%`)
    })
  }

  // 全体的な評価
  const avgOverallTime = results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length
  const overallSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length

  console.log(`\n📊 全体評価:`)
  console.log(`  - 平均応答時間: ${Math.round(avgOverallTime)}ms`)
  console.log(`  - 全体成功率: ${Math.round(overallSuccessRate)}%`)

  if (avgOverallTime < 200) {
    console.log('✅ システム全体のパフォーマンスは優秀です')
  } else if (avgOverallTime < 500) {
    console.log('🟡 システム全体のパフォーマンスは良好です')
  } else {
    console.log('🔴 システム全体のパフォーマンスに改善の余地があります')
  }

  return results
}

if (require.main === module) {
  runPerformanceTests().catch(console.error)
}

export { runPerformanceTests }