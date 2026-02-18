-- Delete the corrupt campaign document for XJ6KG9N3N6F9 so it can be re-downloaded
UPDATE notifyre_fax_campaigns 
SET document_path = NULL 
WHERE campaign_id = 'XJ6KG9N3N6F9';