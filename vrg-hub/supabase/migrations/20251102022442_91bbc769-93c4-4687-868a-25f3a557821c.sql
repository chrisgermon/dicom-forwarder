-- Remove word count requirement from newsletter assignments
ALTER TABLE newsletter_assignments 
ALTER COLUMN word_count DROP DEFAULT,
ALTER COLUMN word_count DROP NOT NULL;