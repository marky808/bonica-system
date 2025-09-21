#!/usr/bin/env tsx

/**
 * 本番環境用Google Sheetsテンプレート作成スクリプト
 */

const BASE_URL = 'https://bonica-system.vercel.app'

async function setupProductionTemplates() {
  console.log('🚀 本番環境テンプレート作成開始')

  try {
    // 1. ログイン
    console.log('🔐 本番環境にログイン中...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: '6391'
      })
    })

    const loginResult = await loginResponse.json()
    if (!loginResult.token) {
      throw new Error('ログインに失敗しました')
    }
    console.log('✅ ログイン成功')

    // 2. 既存テンプレート確認
    console.log('📋 既存テンプレート確認中...')
    const templatesResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`, {
      headers: {
        'Authorization': `Bearer ${loginResult.token}`
      }
    })

    const templatesResult = await templatesResponse.json()
    console.log('📋 既存テンプレート:', templatesResult)

    if (templatesResult.templates && templatesResult.templates.length > 0) {
      console.log('✅ テンプレートは既に存在します')
      templatesResult.templates.forEach((template: any) => {
        console.log(`  - ${template.name} (${template.type}): ID ${template.templateSheetId}`)
      })
      return
    }

    // 3. テンプレート作成
    console.log('🔧 Google Sheetsテンプレートを作成中...')
    const createResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResult.token}`
      },
      body: JSON.stringify({
        createSheets: true
      })
    })

    const createResult = await createResponse.json()
    console.log('📊 テンプレート作成結果:', createResult)

    if (createResult.success) {
      console.log('🎉 テンプレート作成成功!')
      console.log('📄 納品書テンプレート:', createResult.templates.delivery)
      console.log('📄 請求書テンプレート:', createResult.templates.invoice)
    } else {
      console.error('❌ テンプレート作成失敗:', createResult.error)
    }

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

setupProductionTemplates()