#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkSetup() {
  console.log('🔍 Vérification de la configuration...\n');
  
  let hasErrors = false;
  
  // 1. Vérifier si Prisma est généré
  console.log('1. Vérification de Prisma...');
  try {
    await prisma.$connect();
    console.log('   ✅ Client Prisma généré et connecté');
  } catch (error) {
    console.log('   ❌ Erreur Prisma:', error.message);
    console.log('   💡 Exécutez: npm run prisma:generate');
    hasErrors = true;
  }
  
  // 2. Vérifier si la base de données existe
  console.log('\n2. Vérification de la base de données...');
  const dbPath = path.join(__dirname, 'prisma', 'dev.db');
  if (fs.existsSync(dbPath)) {
    console.log('   ✅ Base de données trouvée');
  } else {
    console.log('   ❌ Base de données non trouvée');
    console.log('   💡 Exécutez: npm run prisma:push');
    hasErrors = true;
  }
  
  // 3. Vérifier les données
  console.log('\n3. Vérification des données...');
  try {
    const doctorCount = await prisma.doctor.count();
    if (doctorCount > 0) {
      console.log(`   ✅ ${doctorCount} professionnel(s) en base`);
    } else {
      console.log('   ⚠️  Aucun professionnel en base');
      console.log('   💡 Exécutez: npm run prisma:seed');
    }
  } catch (error) {
    console.log('   ❌ Erreur lors de la vérification:', error.message);
    hasErrors = true;
  }
  
  // 4. Vérifier les dépendances
  console.log('\n4. Vérification des dépendances...');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules trouvé');
  } else {
    console.log('   ❌ node_modules non trouvé');
    console.log('   💡 Exécutez: npm install');
    hasErrors = true;
  }
  
  await prisma.$disconnect();
  
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Des erreurs ont été détectées. Veuillez les corriger.');
    process.exit(1);
  } else {
    console.log('✅ Tout est prêt ! Vous pouvez démarrer le serveur avec: npm run dev');
    process.exit(0);
  }
}

checkSetup().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
