ALTER TABLE quotations ADD COLUMN approval_token TEXT;
ALTER TABLE quotations ADD COLUMN approval_token_expires_at DATETIME;
ALTER TABLE quotations ADD COLUMN approval_ip TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_approval_token ON quotations(approval_token);
