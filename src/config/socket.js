// Socket.io foi removido: a Vercel (serverless) não suporta WebSocket.
// O front atualiza por polling (GET /cotacoes e /api/notificacoes).
// Estas funções ficam como no-op para não quebrar quem as chama.
module.exports = {
  init() {},
  getIO() { return null; },
  emitQuotationUpdate() {},
  emitToUser() {},
};
