import { NextResponse } from 'next/server'
import { freeeClient } from '@/lib/freee-client'

interface TestResult {
  test: string
  status: 'success' | 'error'
  message: string
  data?: any
  timestamp: string
}

export async function GET() {
  console.log('=== freee API接続テスト開始 ===')
  
  const results: TestResult[] = []
  let allTestsPassed = true

  // テスト1: 基本接続テスト（事業所情報取得）
  console.log('\n🏢 テスト1: 基本接続テスト（事業所情報取得）')
  try {
    const companiesResult = await freeeClient['request']('/api/1/companies', { method: 'GET' })
    
    if (companiesResult.error) {
      throw new Error(companiesResult.error)
    }
    
    const companies = companiesResult.data as any
    console.log('✅ 事業所情報取得成功')
    console.log(`  - 事業所数: ${companies?.companies?.length || 0}`)
    if (companies?.companies?.[0]) {
      console.log(`  - 事業所名: ${companies.companies[0].display_name}`)
      console.log(`  - 事業所ID: ${companies.companies[0].id}`)
    }
    
    results.push({
      test: '基本接続テスト（事業所情報取得）',
      status: 'success',
      message: `事業所情報取得成功 - ${companies?.companies?.length || 0}件`,
      data: companies?.companies?.[0] ? {
        name: companies.companies[0].display_name,
        id: companies.companies[0].id,
        contact_name: companies.companies[0].contact_name
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    console.error('❌ 事業所情報取得失敗:', errorMessage)
    allTestsPassed = false
    
    results.push({
      test: '基本接続テスト（事業所情報取得）',
      status: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    })
  }

  // テスト2: 取引先API テスト
  console.log('\n🤝 テスト2: 取引先API テスト（一覧取得）')
  try {
    const partnersResult = await freeeClient.getPartners({ limit: 10 })
    
    if (partnersResult.error) {
      throw new Error(partnersResult.error)
    }
    
    const partners = partnersResult.data || []
    console.log('✅ 取引先一覧取得成功')
    console.log(`  - 取引先件数: ${partners.length}`)
    
    if (partners.length > 0) {
      console.log('  - サンプル取引先:')
      partners.slice(0, 3).forEach((partner, index) => {
        console.log(`    ${index + 1}. ${partner.name} (ID: ${partner.id}, コード: ${partner.code || 'なし'})`)
      })
    }
    
    results.push({
      test: '取引先API テスト（一覧取得）',
      status: 'success',
      message: `取引先一覧取得成功 - ${partners.length}件`,
      data: {
        count: partners.length,
        samples: partners.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          code: p.code
        }))
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    console.error('❌ 取引先一覧取得失敗:', errorMessage)
    allTestsPassed = false
    
    results.push({
      test: '取引先API テスト（一覧取得）',
      status: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    })
  }

  // テスト3: テンプレート取得テスト（請求書テンプレート一覧）
  console.log('\n📋 テスト3: テンプレート取得テスト（請求書テンプレート一覧）')
  try {
    const templatesResult = await freeeClient['request'](`/api/1/invoices/templates?company_id=${process.env.FREEE_COMPANY_ID}`, { method: 'GET' })
    
    if (templatesResult.error) {
      throw new Error(templatesResult.error)
    }
    
    const templates = templatesResult.data as any
    const templateList = templates?.invoice_templates || []
    console.log('✅ 請求書テンプレート取得成功')
    console.log(`  - テンプレート数: ${templateList.length}`)
    
    if (templateList.length > 0) {
      console.log('  - 利用可能なテンプレート:')
      templateList.forEach((template: any, index: number) => {
        console.log(`    ${index + 1}. ${template.name} (ID: ${template.id})`)
      })
    }
    
    results.push({
      test: 'テンプレート取得テスト（請求書テンプレート一覧）',
      status: 'success',
      message: `請求書テンプレート取得成功 - ${templateList.length}件`,
      data: {
        count: templateList.length,
        templates: templateList.map((t: any) => ({
          id: t.id,
          name: t.name
        }))
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    console.error('❌ 請求書テンプレート取得失敗:', errorMessage)
    allTestsPassed = false
    
    results.push({
      test: 'テンプレート取得テスト（請求書テンプレート一覧）',
      status: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    })
  }

  // テスト4: 環境変数確認
  console.log('\n⚙️  テスト4: 環境変数確認')
  const envCheck = {
    accessToken: !!process.env.FREEE_ACCESS_TOKEN,
    companyId: !!process.env.FREEE_COMPANY_ID,
    apiBaseUrl: process.env.FREEE_API_BASE_URL || 'https://api.freee.co.jp',
    devMode: process.env.FREEE_DEV_MODE === 'true'
  }
  
  console.log('  - アクセストークン:', envCheck.accessToken ? '✅ 設定済み' : '❌ 未設定')
  console.log('  - 会社ID:', envCheck.companyId ? '✅ 設定済み' : '❌ 未設定')
  console.log('  - API Base URL:', envCheck.apiBaseUrl)
  console.log('  - 開発モード:', envCheck.devMode ? '✅ 有効' : '❌ 無効')
  
  results.push({
    test: '環境変数確認',
    status: (envCheck.accessToken && envCheck.companyId) ? 'success' : 'error',
    message: `環境変数チェック - トークン: ${envCheck.accessToken ? '設定済み' : '未設定'}, 会社ID: ${envCheck.companyId ? '設定済み' : '未設定'}`,
    data: envCheck,
    timestamp: new Date().toISOString()
  })

  console.log('\n=== freee API接続テスト完了 ===')
  console.log(`総合結果: ${allTestsPassed ? '✅ 全テスト成功' : '❌ 一部テスト失敗'}`)

  return NextResponse.json({
    success: allTestsPassed,
    message: allTestsPassed ? '全てのテストが成功しました' : '一部のテストが失敗しました',
    results,
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.status === 'success').length,
      failedTests: results.filter(r => r.status === 'error').length
    }
  }, { status: allTestsPassed ? 200 : 500 })
}