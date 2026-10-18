-- Additive only. Existing enquiries and receipt hashes are unchanged.
ALTER TABLE site_visit_leads ADD COLUMN preview_context TEXT;
