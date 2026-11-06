-- Schema consolidado para PostgreSQL (Supabase). Equivale às migrations SQLite 001-013.
-- Booleanos continuam INTEGER (0/1) para manter compatibilidade com o código existente.

CREATE TABLE IF NOT EXISTS organizations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'trial',
  max_users   INTEGER NOT NULL DEFAULT 5,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO organizations (id, name, slug, plan, max_users)
VALUES (1, 'Padrão', 'default', 'pro', 100)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('organizations', 'id'), GREATEST((SELECT MAX(id) FROM organizations), 1));

CREATE TABLE IF NOT EXISTS users (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL,
  email                  TEXT NOT NULL UNIQUE,
  password_hash          TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('vendas', 'compras', 'admin')),
  phone_whatsapp         TEXT,
  active                 INTEGER NOT NULL DEFAULT 1,
  whatsapp_instance_name TEXT,
  whatsapp_connected_at  TIMESTAMPTZ,
  organization_id        INTEGER DEFAULT 1 REFERENCES organizations(id),
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id              SERIAL PRIMARY KEY,
  license_plate   TEXT NOT NULL UNIQUE,
  make            TEXT,
  model           TEXT,
  year_model      INTEGER,
  year_manuf      INTEGER,
  color           TEXT,
  fuel            TEXT,
  chassis         TEXT,
  plate_data_json TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parts_catalog (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  default_price DOUBLE PRECISION,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id                         SERIAL PRIMARY KEY,
  quote_number               TEXT NOT NULL UNIQUE,
  customer_id                INTEGER NOT NULL REFERENCES customers(id),
  vehicle_id                 INTEGER NOT NULL REFERENCES vehicles(id),
  created_by_user_id         INTEGER NOT NULL REFERENCES users(id),
  assigned_buyer_id          INTEGER REFERENCES users(id),
  status                     TEXT NOT NULL DEFAULT 'pendente'
                             CHECK (status IN ('pendente','em_cotacao','cotado','peca_chegou','cancelado')),
  notes_vendas               TEXT,
  notes_compras              TEXT,
  whatsapp_sent_at           TIMESTAMPTZ,
  whatsapp_sent_by           INTEGER REFERENCES users(id),
  customer_approved          INTEGER DEFAULT NULL,
  customer_approved_at       TIMESTAMPTZ DEFAULT NULL,
  customer_approval_source   TEXT DEFAULT NULL,
  photo_path                 TEXT,
  approval_token             TEXT,
  approval_token_expires_at  TIMESTAMPTZ,
  approval_ip                TEXT,
  created_at                 TIMESTAMPTZ DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                 SERIAL PRIMARY KEY,
  quotation_id       INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  part_catalog_id    INTEGER REFERENCES parts_catalog(id),
  part_name          TEXT NOT NULL,
  part_code          TEXT,
  quantity           INTEGER NOT NULL DEFAULT 1,
  unit_price         DOUBLE PRECISION,
  total_price        DOUBLE PRECISION,
  labor_cost_vendas  DOUBLE PRECISION DEFAULT 0,
  labor_cost_compras DOUBLE PRECISION DEFAULT 0,
  delivery_days      INTEGER,
  delivery_deadline  TIMESTAMPTZ,
  supplier_name      TEXT,
  item_status        TEXT DEFAULT 'aguardando'
                     CHECK (item_status IN ('aguardando','em_cotacao','cotado','peca_chegou')),
  arrived_at         TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  quotation_id      INTEGER REFERENCES quotations(id),
  quotation_item_id INTEGER REFERENCES quotation_items(id),
  type              TEXT NOT NULL CHECK (type IN (
    'nova_cotacao','cotacao_respondida','peca_chegou','status_atualizado','cotacao_atualizada'
  )),
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  quotation_id    INTEGER REFERENCES quotations(id),
  action          TEXT NOT NULL,
  old_value_json  TEXT,
  new_value_json  TEXT,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (key, value) VALUES ('whatsapp_template',
'Olá, [NOME DO CLIENTE]! 👋

Sua cotação está pronta! Veja os detalhes abaixo:

🚗 *Veículo:* [VEÍCULO] — Placa [PLACA]

📦 *Peças cotadas:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]💰 *Total estimado: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Confirma para encomendarmos? 😊')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  active     INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plate_cache (
  plate     TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- Sessões (substitui session-file-store, que não funciona em serverless)
CREATE TABLE IF NOT EXISTS sessions (
  sid     TEXT PRIMARY KEY,
  sess    TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_approval_token ON quotations(approval_token);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vehicle_id ON quotations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_buyer_id ON quotations(assigned_buyer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

-- O app acessa o banco só pelo backend (conexão direta). Bloqueia a API pública do Supabase.
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalog   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_cache     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
