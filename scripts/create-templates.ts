#!/usr/bin/env tsx

/**
 * Google Sheetsテンプレートを手動で作成するスクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTemplates() {
  console.log('🔧 Google Sheetsテンプレート作成開始')

  try {
    // 既存のテンプレートを確認
    const existingTemplates = await prisma.googleSheetTemplate.findMany()
    console.log('📋 既存テンプレート数:', existingTemplates.length)

    // 古いテンプレートをすべて削除
    console.log('🗑️ 既存テンプレートを削除中...')
    await prisma.googleSheetTemplate.deleteMany({})

    // 正しいテンプレートIDで新しいテンプレートを作成
    const deliveryTemplate = await prisma.googleSheetTemplate.create({
      data: {
        name: '納品書テンプレート',
        type: 'delivery',
        templateSheetId: '521792886', // .env.localからの値
      }
    })

    console.log('✅ 納品書テンプレート:', deliveryTemplate)

    // 請求書テンプレート作成
    const invoiceTemplate = await prisma.googleSheetTemplate.create({
      data: {
        name: '請求書テンプレート',
        type: 'invoice',
        templateSheetId: '1125769553', // .env.localからの値
      }
    })

    console.log('✅ 請求書テンプレート:', invoiceTemplate)

    // 作成されたテンプレートを確認
    const allTemplates = await prisma.googleSheetTemplate.findMany()
    console.log('📋 作成済みテンプレート一覧:')
    allTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.type}): ID ${template.templateSheetId}`)
    })

    console.log('🎉 テンプレート作成完了!')

  } catch (error) {
    console.error('❌ テンプレート作成エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTemplates()