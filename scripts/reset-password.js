const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPassword() {
  const password = '6391';
  const hash = await bcrypt.hash(password, 10);

  console.log('Generated hash:', hash);

  // Update user password
  const user = await prisma.user.update({
    where: { email: '808works@gmail.com' },
    data: { password: hash }
  });

  console.log('User updated:', { email: user.email, name: user.name });

  // Verify the password
  const isValid = await bcrypt.compare(password, user.password);
  console.log('Password verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
