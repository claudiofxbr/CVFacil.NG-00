#!/usr/bin/env node

/**
 * Script para executar migrations no banco de dados Neon
 * Uso: node scripts/run-migrations.js
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MIGRATION_TOKEN = process.env.MIGRATION_TOKEN || 'dev-migration-token';

async function runMigrations() {
  console.log('🚀 Iniciando migrations do CVFacil.NG...\n');

  try {
    console.log(`📡 Conectando ao servidor: ${API_URL}/api/migrate`);

    const response = await fetch(`${API_URL}/api/migrate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MIGRATION_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log('\n✅ Migrations executadas com sucesso!\n');
      console.log('📋 Migrations aplicadas:');
      data.migrations.forEach((migration) => {
        console.log(`   ✓ ${migration}`);
      });
      console.log('\n🎉 Banco de dados atualizado!\n');
      process.exit(0);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('\n❌ Erro ao executar migrations:\n', error.message);
    console.log('\n💡 Dicas:');
    console.log('   1. Certifique-se de que o servidor está rodando (npm run dev)');
    console.log('   2. Verifique a variável DATABASE_URL em .env.local');
    console.log('   3. Verifique a conexão com Neon em https://console.neon.tech\n');
    process.exit(1);
  }
}

runMigrations();
