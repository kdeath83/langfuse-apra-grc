-- Migration: Add APRA CPS fields to traces
-- This adds a JSON field to store APRA CPS metadata

-- Add apra_cps column to traces table
ALTER TABLE traces ADD COLUMN IF NOT EXISTS apra_cps JSONB DEFAULT NULL;

-- Create index for querying CPS status
CREATE INDEX IF NOT EXISTS traces_apra_cps_idx ON traces USING GIN (apra_cps);

-- Partial index for material impact queries (optimizes finding traces with material impact)
CREATE INDEX IF NOT EXISTS idx_traces_material_impact 
ON traces(project_id, (apra_cps->>'materialImpact')) 
WHERE apra_cps->>'materialImpact' = 'true';

-- Partial index for pending notification queries (optimizes 72-hour notification checks)
CREATE INDEX IF NOT EXISTS idx_traces_pending_notification 
ON traces(project_id, (apra_cps->>'cps234Classification')) 
WHERE apra_cps->>'materialImpact' = 'true' 
  AND apra_cps->>'notifiedApra' = 'false';

-- Add comment explaining the field
COMMENT ON COLUMN traces.apra_cps IS 'APRA CPS metadata for financial services regulation. Stores material impact flags, notification status, and CPS timestamps.';
