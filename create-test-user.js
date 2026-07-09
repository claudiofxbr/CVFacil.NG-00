const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Dados de teste
    const email = 'teste@example.com';
    const password = '123456';
    const name = 'Usuário Teste';

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Deletar se existe
    await prisma.user.deleteMany({
      where: { email }
    });

    // Criar novo usuário
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log('');
    console.log('📧 Email: ' + email);
    console.log('🔑 Senha: ' + password);
    console.log('👤 Nome: ' + name);
    console.log('');
    console.log('Agora você pode fazer login com essas credenciais.');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
