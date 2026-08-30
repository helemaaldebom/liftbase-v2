-- Add 'manual_review_required' to extraction_status constraint
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE maintenance_documents
DROP CONSTRAINT IF EXISTS valid_extraction_status;

-- Add new constraint with manual_review_required option
ALTER TABLE maintenance_documents
ADD CONSTRAINT valid_extraction_status
CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'manual_review_required'));
