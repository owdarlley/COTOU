-- Fundação multi-tenant: tabela organizations + FK em users
CREATE TABLE IF NOT EXISTS organizations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'trial',
  max_users   INTEGER NOT NULL DEFAULT 5,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT (datetime('now'))
);

-- Organização padrão para instalação single-tenant existente
INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users)
VALUES (1, 'Padrão', 'default', 'pro', 100);

-- Adiciona organization_id aos usuários (SQLite não suporta REFERENCES com DEFAULT não-nulo)
ALTER TABLE users ADD COLUMN organization_id INTEGER DEFAULT 1;

-- Garante que todas as linhas existentes tenham organization_id = 1
UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;
