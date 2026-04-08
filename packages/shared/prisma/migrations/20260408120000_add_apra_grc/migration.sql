-- Migration: Add APRA GRC fields to traces
-- This adds a JSON field to store APRA GRC metadata

-- Add apra_grc column to traces table
ALTER TABLE traces ADD COLUMN IF NOT EXISTS apra_grc JSONB DEFAULT NULL;

-- Create index for querying GRC status
CREATE INDEX IF NOT EXISTS traces_apra_grc_idx ON traces USING GIN (apra_grc);

-- Partial index for material impact queries (optimizes finding traces with material impact)
CREATE INDEX IF NOT EXISTS idx_traces_material_impact 
ON traces(project_id, (apra_grc->>'materialImpact')) 
WHERE apra_grc->>'materialImpact' = 'true';

-- Partial index for pending notification queries (optimizes 72-hour notification checks)
CREATE INDEX IF NOT EXISTS idx_traces_pending_notification 
ON traces(project_id, (apra_grc->>'cps234Classification')) 
WHERE apra_grc->>'materialImpact' = 'true' 
  AND apra_grc->>'notifiedApra' = 'false';

-- Add comment explaining the field
COMMENT ON COLUMN traces.apra_grc IS 'APRA GRC metadata for financial services regulation. Stores material impact flags, notification status, and CPS timestamps.';
