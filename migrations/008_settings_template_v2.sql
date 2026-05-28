-- Migra para template único com marcadores legíveis [MAIÚSCULAS]
INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_template',
'Olá, [NOME DO CLIENTE]! 👋

Sua cotação está pronta! Veja os detalhes abaixo:

🚗 *Veículo:* [VEÍCULO] — Placa [PLACA]

📦 *Peças cotadas:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]💰 *Total estimado: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Confirma para encomendarmos? 😊');

DELETE FROM settings WHERE key IN ('whatsapp_intro', 'whatsapp_outro', 'whatsapp_template_v1');
