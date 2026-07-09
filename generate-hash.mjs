import bcrypt from 'bcryptjs';

async function generateHash() {
  const hash = await bcrypt.hash('teste123', 12);
  console.log(hash);
}

generateHash();
