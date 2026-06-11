require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { sessionMiddleware } = require('./src/app');
const socketConfig = require('./src/config/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const allowedSocketOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowedSocketOrigins.includes(origin) || (origin && origin.endsWith('.trycloudflare.com'))) {
        return cb(null, true);
      }
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

socketConfig.init(io);

// Injeta sessão express nas conexões Socket.io para verificar autenticação
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
  socket.on('registrar', ({ userId }) => {
    const sessionUserId = socket.request.session?.userId;
    // Só permite entrar no room se o userId declarado bater com a sessão autenticada
    if (sessionUserId && sessionUserId === userId) {
      socket.join(`user:${userId}`);
    } else if (sessionUserId && userId && sessionUserId !== userId) {
      // Usuário tenta registrar como outro — ignora silenciosamente (sem log para não spam)
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 COTOU API rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
