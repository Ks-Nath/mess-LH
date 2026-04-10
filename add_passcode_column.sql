-- Add the establishment_passcode column to the hostels table
-- This allows the passcode to be managed in the database instead of a local .env file.
-- Run this in your Supabase SQL Editor.

ALTER TABLE hostels ADD COLUMN IF NOT EXISTS establishment_passcode TEXT DEFAULT 'Code11@10';

-- For existing rows, ensure the default is applied if it wasn't automatically
UPDATE hostels SET establishment_passcode = 'Code11@10' WHERE establishment_passcode IS NULL;
