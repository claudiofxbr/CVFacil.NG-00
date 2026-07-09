const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, password: true }
    });

    console.log('\n📊 USUÁRIOS NO BANCO:\n');
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado!');
    } else {
      users.forEach((u, i) => {
        console.log(`${i + 1}. Email: ${u.email}`);
        console.log(`   Nome: ${u.name}`);
        console.log(`   Senha Hash: ${u.password ? u.password.substring(0, 20) + '...' : 'NULL'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
