ALTER TABLE quotations ADD COLUMN customer_approval_source TEXT DEFAULT NULL;
-- valores: 'whatsapp' | 'link' | 'manual'
