PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK(role IN ('vendas', 'compras', 'admin')),
  phone_whatsapp  TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT (datetime('now')),
  updated_at      DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  DATETIME DEFAULT (datetime('now')),
  updated_at  DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  license_plate   TEXT NOT NULL UNIQUE,
  make            TEXT,
  model           TEXT,
  year_model      INTEGER,
  year_manuf      INTEGER,
  color           TEXT,
  fuel            TEXT,
  chassis         TEXT,
  plate_data_json TEXT,
  created_at      DATETIME DEFAULT (datetime('now')),
  updated_at      DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parts_catalog (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  default_price REAL,
  created_at    DATETIME DEFAULT (datetime('now')),
  updated_at    DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number        TEXT NOT NULL UNIQUE,
  customer_id         INTEGER NOT NULL REFERENCES customers(id),
  vehicle_id          INTEGER NOT NULL REFERENCES vehicles(id),
  created_by_user_id  INTEGER NOT NULL REFERENCES users(id),
  assigned_buyer_id   INTEGER REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK(status IN ('pendente','em_cotacao','cotado','peca_chegou','cancelado')),
  notes_vendas        TEXT,
  notes_compras       TEXT,
  whatsapp_sent_at    DATETIME,
  whatsapp_sent_by    INTEGER REFERENCES users(id),
  created_at          DATETIME DEFAULT (datetime('now')),
  updated_at          DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id      INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  part_catalog_id   INTEGER REFERENCES parts_catalog(id),
  part_name         TEXT NOT NULL,
  part_code         TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1,
  unit_price        REAL,
  total_price       REAL,
  labor_cost_vendas REAL DEFAULT 0,
  labor_cost_compras REAL DEFAULT 0,
  delivery_days     INTEGER,
  delivery_deadline DATETIME,
  supplier_name     TEXT,
  item_status       TEXT DEFAULT 'aguardando'
                    CHECK(item_status IN ('aguardando','em_cotacao','cotado','peca_chegou')),
  arrived_at        DATETIME,
  notes             TEXT,
  created_at        DATETIME DEFAULT (datetime('now')),
  updated_at        DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  quotation_id      INTEGER REFERENCES quotations(id),
  quotation_item_id INTEGER REFERENCES quotation_items(id),
  type              TEXT NOT NULL CHECK(type IN (
    'nova_cotacao',
    'cotacao_respondida',
    'peca_chegou',
    'status_atualizado',
    'cotacao_atualizada'
  )),
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  read_at           DATETIME,
  created_at        DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER REFERENCES users(id),
  quotation_id    INTEGER REFERENCES quotations(id),
  action          TEXT NOT NULL,
  old_value_json  TEXT,
  new_value_json  TEXT,
  ip_address      TEXT,
  created_at      DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at);
