const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLogin() {
  const email = '808works@gmail.com';
  const password = '6391';

  console.log('🔍 Testing login for:', email);

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ User found:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });

  console.log('🔐 Password hash in DB:', user.password.substring(0, 30) + '...');
  console.log('🔑 Testing password:', password);

  // Test password
  const isValid = await bcrypt.compare(password, user.password);
  console.log('🎯 Password match result:', isValid ? '✅ SUCCESS' : '❌ FAILED');

  if (!isValid) {
    console.log('\n🔧 Regenerating password hash...');
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash.substring(0, 30) + '...');

    await prisma.user.update({
      where: { email },
      data: { password: newHash }
    });

    // Verify again
    const updatedUser = await prisma.user.findUnique({ where: { email } });
    const isValidNow = await bcrypt.compare(password, updatedUser.password);
    console.log('✅ After update, password match:', isValidNow ? '✅ SUCCESS' : '❌ STILL FAILED');
  }

  await prisma.$disconnect();
}

testLogin().catch(console.error);
