import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create categories
  console.log('Creating categories...')
  const categories = [
    '果物',
    '野菜',
    '穀物', 
    '冷凍',
    'その他'
  ]

  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    })
  }

  // Create admin user (requires environment variables)
  console.log('Creating admin user...')
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Admin'

  if (!adminEmail || !adminPassword) {
    console.log('⚠️ INITIAL_ADMIN_EMAIL と INITIAL_ADMIN_PASSWORD が設定されていません。管理者ユーザーの作成をスキップします。')
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    console.log(`✅ 管理者ユーザー作成完了: ${adminEmail}`)
  }

  // Create sample suppliers
  console.log('Creating sample suppliers...')
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

  // Create sample customers
  console.log('Creating sample customers...')
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

  console.log('Database seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })