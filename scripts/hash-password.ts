import * as bcrypt from 'bcrypt';

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.error('Uso: npx ts-node scripts/hash-password.ts <password>');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\n--- Generador de Hash para Admin ---');
  console.log('Password original:', password);
  console.log('Hash de bcrypt:', hash);
  console.log('------------------------------------\n');
  console.log('Copiá el hash en tu archivo .env en la variable ADMIN_PASSWORD:');
  console.log(`ADMIN_PASSWORD="${hash}"\n`);
}

generateHash().catch(console.error);
