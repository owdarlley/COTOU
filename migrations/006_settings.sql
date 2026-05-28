CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_template',
'Olá, *{{customer_name}}*! 👋

Sua cotação *#{{quote_number}}* está pronta!

🚗 *Veículo:* {{vehicle}} — Placa {{plate}}

📦 *Peças cotadas:*
{{items}}

{{labor}}💰 *Total estimado: R$ {{total}}*
{{deadline}}

Confirma para encomendarmos? 😊');
