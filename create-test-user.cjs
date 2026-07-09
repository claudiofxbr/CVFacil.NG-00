const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const email = 'teste@example.com';
    const password = '123456';
    const name = 'Usuário Teste';

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.deleteMany({ where: { email } });

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });

    console.log('\n✅ Usuário criado com sucesso!\n');
    console.log('📧 Email: ' + email);
    console.log('🔑 Senha: ' + password);
    console.log('👤 Nome: ' + name);
    console.log('\nAgora você pode fazer login com essas credenciais.\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
