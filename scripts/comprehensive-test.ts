#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  details: string
  duration: number
}

const results: TestResult[] = []

async function addResult(name: string, testFn: () => Promise<any>) {
  const start = Date.now()
  try {
    await testFn()
    results.push({
      name,
      status: 'PASS',
      details: 'テスト成功',
      duration: Date.now() - start
    })
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    })
  }
}

async function testDatabaseConnection() {
  const users = await prisma.user.findMany()
  if (users.length === 0) throw new Error('ユーザーが見つかりません')
  console.log(`✅ データベース接続OK - ${users.length}名のユーザー`)
}

async function testDataIntegrity() {
  const [purchases, deliveries, suppliers, customers] = await Promise.all([
    prisma.purchase.count(),
    prisma.delivery.count(),
    prisma.supplier.count(),
    prisma.customer.count()
  ])

  console.log(`📊 データ整合性チェック:`)
  console.log(`  - 仕入れ: ${purchases}件`)
  console.log(`  - 納品: ${deliveries}件`)
  console.log(`  - 仕入先: ${suppliers}件`)
  console.log(`  - 顧客: ${customers}件`)

  if (purchases === 0) throw new Error('仕入れデータがありません')
  if (suppliers === 0) throw new Error('仕入先データがありません')
  if (customers === 0) throw new Error('顧客データがありません')
}

async function testAPIHealth() {
  const response = await fetch('http://localhost:3000/api/health')
  if (!response.ok) throw new Error(`Health API failed: ${response.status}`)
  const data = await response.json()
  console.log('🏥 Health API:', data)
}

async function testAuthenticationFlow() {
  // 正常ログイン
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '808works.jp@gmail.com',
      password: '6391'
    })
  })

  if (!loginResponse.ok) throw new Error('ログインに失敗')
  const { token, user } = await loginResponse.json()

  if (!token || !user) throw new Error('認証トークンまたはユーザー情報がありません')
  console.log('🔐 認証成功:', user.name)

  // 不正ログイン
  const invalidLogin = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'invalid@test.com',
      password: 'wrong'
    })
  })

  if (invalidLogin.ok) throw new Error('不正ログインが成功してしまった')
  console.log('🚫 不正ログイン拒否OK')
}

async function testPurchaseDataValidation() {
  const purchases = await prisma.purchase.findMany({
    include: {
      supplier: true,
      category: true
    }
  })

  for (const purchase of purchases) {
    if (!purchase.supplier) throw new Error(`Purchase ${purchase.id}: supplier not found`)
    if (!purchase.category) throw new Error(`Purchase ${purchase.id}: category not found`)
    if (purchase.quantity <= 0) throw new Error(`Purchase ${purchase.id}: invalid quantity`)
    if (purchase.unitPrice <= 0) throw new Error(`Purchase ${purchase.id}: invalid unit price`)
    if (purchase.remainingQuantity < 0) throw new Error(`Purchase ${purchase.id}: negative remaining quantity`)
  }

  console.log(`✅ 仕入れデータ検証完了: ${purchases.length}件`)
}

async function testDeliveryDataValidation() {
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

  for (const delivery of deliveries) {
    if (!delivery.customer) throw new Error(`Delivery ${delivery.id}: customer not found`)
    if (delivery.items.length === 0) throw new Error(`Delivery ${delivery.id}: no items`)

    let calculatedTotal = 0
    for (const item of delivery.items) {
      if (!item.purchase) throw new Error(`Delivery ${delivery.id}: purchase not found for item`)
      if (item.quantity <= 0) throw new Error(`Delivery ${delivery.id}: invalid item quantity`)
      if (item.unitPrice <= 0) throw new Error(`Delivery ${delivery.id}: invalid item unit price`)
      calculatedTotal += item.amount
    }

    if (Math.abs(delivery.totalAmount - calculatedTotal) > 0.01) {
      throw new Error(`Delivery ${delivery.id}: total amount mismatch`)
    }
  }

  console.log(`✅ 納品データ検証完了: ${deliveries.length}件`)
}

async function testInventoryCalculation() {
  const purchases = await prisma.purchase.findMany()
  const deliveryItems = await prisma.deliveryItem.findMany()

  for (const purchase of purchases) {
    let usedQuantity = 0
    for (const item of deliveryItems) {
      if (item.purchaseId === purchase.id) {
        usedQuantity += item.quantity
      }
    }

    const expectedRemaining = purchase.quantity - usedQuantity
    if (Math.abs(purchase.remainingQuantity - expectedRemaining) > 0.01) {
      throw new Error(`Purchase ${purchase.id}: inventory calculation mismatch`)
    }
  }

  console.log(`✅ 在庫計算検証完了`)
}

async function runComprehensiveTest() {
  console.log('🚀 BONICA農産物管理システム 包括的テスト開始')
  console.log('=' * 60)

  await addResult('データベース接続テスト', testDatabaseConnection)
  await addResult('データ整合性テスト', testDataIntegrity)
  await addResult('Health APIテスト', testAPIHealth)
  await addResult('認証フローテスト', testAuthenticationFlow)
  await addResult('仕入れデータ検証', testPurchaseDataValidation)
  await addResult('納品データ検証', testDeliveryDataValidation)
  await addResult('在庫計算検証', testInventoryCalculation)

  console.log('\n📊 テスト結果サマリー')
  console.log('=' * 60)

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  console.table(results.map(r => ({
    テスト名: r.name,
    結果: r.status,
    詳細: r.details.substring(0, 50),
    実行時間: `${r.duration}ms`
  })))

  console.log(`\n✅ 成功: ${passed}件`)
  console.log(`❌ 失敗: ${failed}件`)
  console.log(`⏭️  スキップ: ${skipped}件`)
  console.log(`⏱️  総実行時間: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`)

  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`)
    })
  }

  await prisma.$disconnect()

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    results
  }
}

if (require.main === module) {
  runComprehensiveTest().catch(console.error)
}

export { runComprehensiveTest }