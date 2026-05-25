require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const socketConfig = require('./src/config/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

socketConfig.init(io);

io.on('connection', (socket) => {
  socket.on('registrar', ({ userId }) => {
    if (userId) socket.join(`user:${userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 COTOU API rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
