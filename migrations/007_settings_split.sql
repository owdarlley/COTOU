-- Separa o template em abertura e encerramento editáveis pelo admin
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('whatsapp_intro', 'Sua cotação está pronta! Veja os detalhes abaixo:'),
  ('whatsapp_outro', 'Confirma para encomendarmos? 😊');
