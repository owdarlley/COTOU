-- Multi-tenant: adiciona tabela tenants e tenant_id em todas as entidades principais

CREATE TABLE tenants (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  active         INTEGER NOT NULL DEFAULT 1,
  settings_json  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tenant padrão para dados existentes
INSERT INTO tenants (id, name, slug) VALUES (1, 'Oficina Principal', 'principal');

ALTER TABLE users         ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE customers     ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE quotations    ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE suppliers     ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE parts_catalog ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE notifications ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);

UPDATE users         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE customers     SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE quotations    SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE suppliers     SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE parts_catalog SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = 1 WHERE tenant_id IS NULL;

CREATE INDEX idx_users_tenant         ON users(tenant_id);
CREATE INDEX idx_customers_tenant     ON customers(tenant_id);
CREATE INDEX idx_quotations_tenant    ON quotations(tenant_id);
CREATE INDEX idx_suppliers_tenant     ON suppliers(tenant_id);
CREATE INDEX idx_parts_catalog_tenant ON parts_catalog(tenant_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
