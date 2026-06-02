const { db, runMigrations } = require('../src/config/database');
const User = require('../src/models/User');

runMigrations();

async function seed() {
  const users = [
    { name: 'Admin Sistema',  email: process.env.ADMIN_EMAIL || 'admin@cotou.com.br',   password: process.env.ADMIN_PASSWORD || 'demo1234', role: 'admin'   },
    { name: 'João Vendas',   email: 'vendas@cotou.com.br',   password: 'demo1234', role: 'vendas'  },
    { name: 'Maria Compras', email: 'compras@cotou.com.br',  password: 'demo1234', role: 'compras' }
  ];

  for (const u of users) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (!existing) {
      await User.create(u);
      console.log(`✓ Criado: ${u.email} (${u.role})`);
    } else {
      console.log(`- Já existe: ${u.email}`);
    }
  }
}

seed().catch(console.error);
