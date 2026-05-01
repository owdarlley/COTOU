require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const socketConfig = require('./src/config/socket');
const Notification = require('./src/models/Notification');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

socketConfig.init(io);

io.on('connection', (socket) => {
  socket.on('registrar', ({ userId }) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });
});

// Seed inicial de usuários admin
async function seedAdmin() {
  const User = require('./src/models/User');
  const bcrypt = require('bcryptjs');
  const { db } = require('./src/config/database');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cotou.com.br';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    await User.create({
      name: 'Administrador',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });

    const vendorEmail = 'vendas@cotou.com.br';
    const comprasEmail = 'compras@cotou.com.br';

    if (!db.prepare('SELECT id FROM users WHERE email = ?').get(vendorEmail)) {
      await User.create({ name: 'João Vendas', email: vendorEmail, password: '123456', role: 'vendas' });
    }
    if (!db.prepare('SELECT id FROM users WHERE email = ?').get(comprasEmail)) {
      await User.create({ name: 'Maria Compras', email: comprasEmail, password: '123456', role: 'compras' });
    }

    console.log('[SEED] Usuários iniciais criados:');
    console.log(`  Admin:   ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`  Vendas:  ${vendorEmail} / 123456`);
    console.log(`  Compras: ${comprasEmail} / 123456`);
  }
}

server.listen(PORT, async () => {
  await seedAdmin();
  console.log(`\n🚀 COTOU rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
