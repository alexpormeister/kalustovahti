
-- Fix audit_logs check constraint to allow 'view_ssn' and 'export' actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
  CHECK (action = ANY (ARRAY['create', 'update', 'delete', 'view_ssn', 'export']));

-- Add unique partial index for active vehicle numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_unique_active_number 
  ON public.vehicles (vehicle_number) 
  WHERE status != 'removed';

-- Add first_name, last_name to profiles (split from full_name)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Migrate existing full_name data to first_name/last_name
UPDATE public.profiles 
SET first_name = split_part(COALESCE(full_name, ''), ' ', 1),
    last_name = CASE 
      WHEN position(' ' in COALESCE(full_name, '')) > 0 
      THEN substring(COALESCE(full_name, '') from position(' ' in COALESCE(full_name, '')) + 1)
      ELSE ''
    END
WHERE first_name IS NULL;
