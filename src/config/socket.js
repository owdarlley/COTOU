let _io = null;

module.exports = {
  init(io) {
    _io = io;
  },
  getIO() {
    if (!_io) throw new Error('Socket.io não inicializado');
    return _io;
  },
  // Emite quotation_updated apenas para quem tem acesso à cotação
  emitQuotationUpdate(quotation, data) {
    if (!_io) return;
    _io.to(`user:${quotation.created_by_user_id}`).emit('quotation_updated', data);
    if (quotation.assigned_buyer_id) {
      _io.to(`user:${quotation.assigned_buyer_id}`).emit('quotation_updated', data);
    }
    _io.to('role:compras').emit('quotation_updated', data);
    _io.to('role:admin').emit('quotation_updated', data);
  },
};
