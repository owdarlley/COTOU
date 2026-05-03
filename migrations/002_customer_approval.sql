-- Resposta do cliente à cotação
ALTER TABLE quotations ADD COLUMN customer_approved INTEGER DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN customer_approved_at DATETIME DEFAULT NULL;
