-- Adiciona super_admin ao enum de roles e insere usuário super admin padrão.
-- SQLite não suporta ALTER TABLE para modificar CHECK constraints,
-- então recriamos a tabela users com o novo enum.

PRAGMA foreign_keys = OFF;

CREATE TABLE users_backup AS SELECT * FROM users;

DROP TABLE users;

CREATE TABLE users (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  name                     TEXT NOT NULL,
  email                    TEXT NOT NULL UNIQUE,
  password_hash            TEXT NOT NULL,
  role                     TEXT NOT NULL CHECK(role IN ('vendas', 'compras', 'admin', 'super_admin')),
  phone_whatsapp           TEXT,
  active                   INTEGER NOT NULL DEFAULT 1,
  whatsapp_instance_name   TEXT,
  whatsapp_connected_at    DATETIME,
  tenant_id                INTEGER REFERENCES tenants(id),
  created_at               DATETIME DEFAULT (datetime('now')),
  updated_at               DATETIME DEFAULT (datetime('now'))
);

INSERT INTO users SELECT
  id, name, email, password_hash, role, phone_whatsapp, active,
  whatsapp_instance_name, whatsapp_connected_at, tenant_id,
  created_at, updated_at
FROM users_backup;

DROP TABLE users_backup;

-- Inserir super admin padrão (senha: Admin@2026)
INSERT INTO users (name, email, password_hash, role, active, tenant_id)
VALUES (
  'Super Admin',
  'super@cotou.com.br',
  '$2a$10$yCJM6N4ox6m.V/Fqqt1OH.gGXHvwI9lypr51qLrj6vRm1tNl9kroi',
  'super_admin',
  1,
  NULL
);

PRAGMA foreign_keys = ON;
