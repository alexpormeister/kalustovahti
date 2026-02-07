-- Update duplicate company names to be unique by appending business_id
-- This updates all companies that share a name with another company
UPDATE companies c
SET name = c.name || ' (' || c.business_id || ')'
WHERE c.business_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM companies c2 
  WHERE c2.name = c.name 
  AND c2.id != c.id
);

-- For companies without business_id, append a unique suffix
UPDATE companies c
SET name = c.name || ' #' || LEFT(c.id::text, 6)
WHERE c.business_id IS NULL
AND EXISTS (
  SELECT 1 FROM companies c2 
  WHERE c2.name = c.name 
  AND c2.id != c.id
);

-- Add unique constraint on company name
ALTER TABLE companies ADD CONSTRAINT companies_name_unique UNIQUE (name);

-- Add unique constraint on business_id (if not null)
CREATE UNIQUE INDEX IF NOT EXISTS companies_business_id_unique 
ON companies (business_id) WHERE business_id IS NOT NULL;

-- Fix profiles table security issue:
-- Drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;