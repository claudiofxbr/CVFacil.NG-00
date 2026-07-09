const email = 'teste@example.com';
const password = '123456';

fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
  console.log('\n📤 RESPOSTA DA API:\n');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('❌ Erro:', err.message));
