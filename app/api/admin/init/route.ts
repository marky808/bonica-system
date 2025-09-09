import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // セキュリティチェック: 特定の認証キーが必要
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.INIT_SECRET_KEY
    
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid init key' },
        { status: 401 }
      )
    }

    console.log('🚀 データベース初期化開始...')

    // 1. カテゴリを作成
    console.log('📁 カテゴリを作成中...')
    const categories = ['果物', '野菜', '穀物', '冷凍', 'その他']
    
    for (const categoryName of categories) {
      await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName }
      })
    }

    // 2. 管理者ユーザーを作成
    console.log('👤 管理者ユーザーを作成中...')
    const hashedPassword = await bcrypt.hash(
      process.env.INITIAL_ADMIN_PASSWORD || '6391', 
      12
    )
    
    const adminUser = await prisma.user.upsert({
      where: { email: process.env.INITIAL_ADMIN_EMAIL || '808works@gmail.com' },
      update: {},
      create: {
        email: process.env.INITIAL_ADMIN_EMAIL || '808works@gmail.com',
        name: process.env.INITIAL_ADMIN_NAME || '小西正高',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    // 3. サンプルサプライヤーを作成
    console.log('🏪 サプライヤーを作成中...')
    const suppliers = [
      {
        companyName: '農協東京',
        contactPerson: '田中太郎',
        phone: '03-1234-5678',
        address: '東京都千代田区丸の内1-1-1',
        paymentTerms: '月末締め翌月末払い',
        deliveryConditions: '午前中配送希望',
        specialNotes: '品質にこだわりあり'
      },
      {
        companyName: '九州青果',
        contactPerson: '佐藤花子',
        phone: '092-1234-5678',
        address: '福岡県福岡市博多区博多駅前1-1-1',
        paymentTerms: '20日締め翌月10日払い',
        deliveryConditions: '冷蔵配送必須',
        specialNotes: '有機野菜専門'
      }
    ]

    for (const supplier of suppliers) {
      await prisma.supplier.upsert({
        where: { companyName: supplier.companyName },
        update: {},
        create: supplier
      })
    }

    // 4. サンプル顧客を作成
    console.log('🏢 顧客を作成中...')
    const customers = [
      {
        companyName: 'レストランA',
        contactPerson: '山田シェフ',
        phone: '03-5555-1111',
        deliveryAddress: '東京都渋谷区道玄坂1-1-1',
        billingAddress: '東京都渋谷区道玄坂1-1-1',
        deliveryTimePreference: '午前10時〜11時',
        specialRequests: '新鮮な野菜を優先',
        specialNotes: 'イタリアンレストラン'
      },
      {
        companyName: '食品卸B',
        contactPerson: '鈴木部長',
        phone: '03-6666-2222',
        deliveryAddress: '東京都江東区豊洲2-2-2',
        billingAddress: '東京都中央区築地3-3-3',
        deliveryTimePreference: '午後2時〜4時',
        specialRequests: 'まとめて配送希望',
        specialNotes: '冷凍食品も取り扱い'
      }
    ]

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { companyName: customer.companyName },
        update: {},
        create: customer
      })
    }

    console.log('✅ データベース初期化完了')

    return NextResponse.json({
      success: true,
      message: 'データベースの初期化が完了しました',
      admin: {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    })

  } catch (error) {
    console.error('❌ 初期化エラー:', error)
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Database initialization endpoint. Use POST with proper authentication.',
      required: 'Authorization header with Bearer token'
    },
    { status: 200 }
  )
}