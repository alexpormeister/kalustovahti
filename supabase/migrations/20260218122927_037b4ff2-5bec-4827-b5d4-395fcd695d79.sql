
-- Add new vehicle columns
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS year_model integer;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS co2_emissions numeric;
