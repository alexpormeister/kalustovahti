
-- Allow company_id to be null (null = all companies)
ALTER TABLE public.api_keys ALTER COLUMN company_id DROP NOT NULL;

-- Update validate_api_key to return null company_id for "all companies" keys
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(api_key_id UUID, company_id UUID, permissions JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, company_id, permissions
  FROM public.api_keys
  WHERE key_hash = p_key_hash
$$;
