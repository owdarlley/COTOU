ALTER TABLE quotations ADD COLUMN approval_token TEXT UNIQUE;
ALTER TABLE quotations ADD COLUMN approval_token_expires_at DATETIME;
ALTER TABLE quotations ADD COLUMN approval_ip TEXT;
