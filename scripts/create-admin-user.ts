#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  console.log('🔧 管理ユーザー作成中...')
  
  try {
    // 既存ユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email: '808works@gmail.com' }
    })
    
    if (existingUser) {
      console.log('✅ 管理ユーザーは既に存在します')
      return
    }
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('6391', 12)
    
    // 管理ユーザーを作成
    const user = await prisma.user.create({
      data: {
        name: '小西正高',
        email: '808works@gmail.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    
    console.log('✅ 管理ユーザーを作成しました:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })
    
  } catch (error) {
    console.error('❌ 管理ユーザー作成エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createAdminUser().catch(console.error)
}

export { createAdminUser }